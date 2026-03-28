import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader } from '@googlemaps/js-api-loader';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Undo, Redo, Trash2, Navigation, Route, MapPin, ArrowLeft, Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getKeyBody } from '@/lib/googleMapsKey';

import { ElevationProfile } from '@/components/ElevationProfile';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useDistanceUnits } from '@/contexts/DistanceUnitsContext';

declare global {
  interface Window {
    google: typeof google;
  }
}

// Interface pour les segments hybrides
interface RouteSegment {
  startPoint: google.maps.LatLng;
  endPoint: google.maps.LatLng;
  mode: 'manual' | 'guided';
  polyline: google.maps.Polyline;
  coordinates: google.maps.LatLng[];
}

// Interface pour les données d'édition
interface EditRouteData {
  id: string;
  name: string;
  description: string;
  coordinates: Array<{ lat: number; lng: number }>;
  waypoints?: Array<{ lat: number; lng: number; mode: 'manual' | 'guided' }>;
}

/** Chemin détaillé le long des routes (plus fidèle que overview_path seul). */
function buildPathFromDirectionsResult(result: google.maps.DirectionsResult): google.maps.LatLng[] {
  const route = result.routes[0];
  if (!route) return [];
  const path: google.maps.LatLng[] = [];
  for (const leg of route.legs) {
    for (const step of leg.steps) {
      step.path.forEach((p) => path.push(p));
    }
  }
  if (path.length > 0) return path;
  return route.overview_path || [];
}

/** Échantillonnage géodésique pour estimer le dénivelé sur les segments « ligne droite ». */
const DENSIFY_MAX_SEGMENT_M = 45;

function densifyLatLngPath(points: google.maps.LatLng[]): google.maps.LatLng[] {
  if (points.length < 2) return points;
  const spherical = google.maps.geometry.spherical;
  const out: google.maps.LatLng[] = [points[0]];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const dist = spherical.computeDistanceBetween(a, b);
    const steps = Math.max(1, Math.ceil(dist / DENSIFY_MAX_SEGMENT_M));
    for (let k = 1; k <= steps; k++) {
      out.push(spherical.interpolate(a, b, k / steps));
    }
  }
  return out;
}

/** Positions le long du chemin, alignées sur le nombre d’échantillons d’élévation (profil / 3D). */
function resamplePathEvenly(
  points: google.maps.LatLng[],
  sampleCount: number
): Array<{ lat: number; lng: number }> {
  if (points.length < 2 || sampleCount < 2) {
    return points.map((p) => ({ lat: p.lat(), lng: p.lng() }));
  }
  const spherical = google.maps.geometry.spherical;
  const cumulative: number[] = [0];
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += spherical.computeDistanceBetween(points[i], points[i + 1]);
    cumulative.push(total);
  }
  if (total < 1e-6) {
    return points.map((p) => ({ lat: p.lat(), lng: p.lng() }));
  }
  const out: Array<{ lat: number; lng: number }> = [];
  for (let s = 0; s < sampleCount; s++) {
    const distAlong = (total * s) / (sampleCount - 1);
    let j = 0;
    while (j < cumulative.length - 1 && cumulative[j + 1] < distAlong) j++;
    const segStart = points[j];
    const segEnd = points[j + 1];
    const segLen = cumulative[j + 1] - cumulative[j];
    const t = segLen < 1e-6 ? 0 : (distAlong - cumulative[j]) / segLen;
    const p = spherical.interpolate(segStart, segEnd, Math.min(1, Math.max(0, t)));
    out.push({ lat: p.lat(), lng: p.lng() });
  }
  return out;
}

/** Réduit le bruit des petites oscillations du MNE (m). */
const ELEV_NOISE_THRESHOLD_M = 2;

export const RouteCreation = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { formatKm } = useDistanceUnits();
  
  const { getCurrentPosition } = useGeolocation();
  
  const isEditMode = searchParams.get('edit') === 'true';
  const editRouteDataRef = useRef<EditRouteData | null>(null);
  
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const segments = useRef<RouteSegment[]>([]);
  const waypoints = useRef<google.maps.LatLng[]>([]);
  const elevationService = useRef<google.maps.ElevationService | null>(null);
  const directionsService = useRef<google.maps.DirectionsService | null>(null);
  const waypointMarkers = useRef<google.maps.Marker[]>([]);
  
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [routeElevations, setRouteElevations] = useState<number[]>([]);
  const [showElevationProfile, setShowElevationProfile] = useState(true);
  const [totalDistance, setTotalDistance] = useState(0);
  const [totalElevationGain, setTotalElevationGain] = useState(0);
  const [totalElevationLoss, setTotalElevationLoss] = useState(0);
  const [elevationChartCoords, setElevationChartCoords] = useState<Array<{ lat: number; lng: number }>>([]);
  const [isManualMode, setIsManualMode] = useState(false);
  /** Pour re-render (les refs waypoints/segments ne déclenchent pas de render). */
  const [waypointCount, setWaypointCount] = useState(0);
  
  // Historique pour redo
  const undoHistory = useRef<Array<{
    waypoint: google.maps.LatLng;
    segment: RouteSegment | null;
    marker: google.maps.Marker | null;
    mode: 'manual' | 'guided';
  }>>([]);
  const [canRedo, setCanRedo] = useState(false);
  
  // Ref pour éviter stale closure dans le listener de click
  const isManualModeRef = useRef(false);

  useEffect(() => {
    isManualModeRef.current = isManualMode;
  }, [isManualMode]);

  /** Toujours invoquer la dernière version depuis le listener Maps (évite closures obsolètes). */
  const addWaypointRef = useRef<(latLng: google.maps.LatLng) => Promise<void>>(async () => {});

  // Charger les données d'édition depuis localStorage
  useEffect(() => {
    if (isEditMode) {
      const storedData = localStorage.getItem('editRouteData');
      if (storedData) {
        try {
          editRouteDataRef.current = JSON.parse(storedData);
        } catch (e) {
          console.error('Erreur parsing editRouteData:', e);
        }
      }
    }
    
    return () => {
      // Nettoyer les données d'édition au démontage
      localStorage.removeItem('editRouteData');
    };
  }, [isEditMode]);


  // Charger l'itinéraire existant sur la carte
  const loadExistingRoute = async () => {
    if (!editRouteDataRef.current || !map.current) return;
    
    const savedWaypoints = editRouteDataRef.current.waypoints;
    const coords = editRouteDataRef.current.coordinates;
    
    // Si on a les waypoints originaux, les utiliser
    if (savedWaypoints && savedWaypoints.length >= 2) {
      // Charger les waypoints et recréer les segments
      for (let i = 0; i < savedWaypoints.length; i++) {
        const wp = savedWaypoints[i];
        const latLng = new google.maps.LatLng(wp.lat, wp.lng);
        waypoints.current.push(latLng);
        addWaypointMarker(latLng, i, wp.mode || 'manual');
        
        // Créer le segment vers ce point (sauf pour le premier)
        if (i > 0) {
          const prevWp = savedWaypoints[i - 1];
          const prevLatLng = new google.maps.LatLng(prevWp.lat, prevWp.lng);
          
          let segment: RouteSegment | null;
          if (wp.mode === 'guided') {
            segment = await createGuidedSegment(prevLatLng, latLng);
          } else {
            segment = createManualSegment(prevLatLng, latLng);
          }
          
          if (segment) {
            segments.current.push(segment);
          }
        }
      }
    } else if (coords && coords.length > 0) {
      // Fallback : utiliser les coordonnées (ancien format sans waypoints)
      const latLngs = coords.map(c => new google.maps.LatLng(c.lat, c.lng));
      
      // Stocker le premier et dernier point comme waypoints
      waypoints.current.push(latLngs[0]);
      waypoints.current.push(latLngs[latLngs.length - 1]);
      
      addWaypointMarker(latLngs[0], 0, 'manual');
      addWaypointMarker(latLngs[latLngs.length - 1], 1, 'manual');

      // Créer une seule polyline pour tout le tracé existant
      const existingPolyline = new google.maps.Polyline({
        path: latLngs,
        geodesic: true,
        strokeColor: '#f97316',
        strokeOpacity: 1.0,
        strokeWeight: 4,
        map: map.current,
      });

      segments.current.push({
        startPoint: latLngs[0],
        endPoint: latLngs[latLngs.length - 1],
        mode: 'manual',
        polyline: existingPolyline,
        coordinates: latLngs
      });
    }

    // Centrer sur l'itinéraire
    if (waypoints.current.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      waypoints.current.forEach(latLng => bounds.extend(latLng));
      map.current.fitBounds(bounds, 50);
    }

    // Calculer les stats
    await updateElevationAndStats();
    setWaypointCount(waypoints.current.length);

    toast.success("Itinéraire chargé - modifiez les points");
  };

  // Initialiser la carte
  useEffect(() => {
    if (!mapContainer.current || isMapLoaded) return;

    const initializeMap = async () => {
      try {
        const { data: apiKeyData } = await supabase.functions.invoke('google-maps-proxy', {
          body: getKeyBody()
        });
        
        const googleMapsApiKey = apiKeyData?.apiKey || 'FALLBACK_KEY';
        
        const loader = new Loader({
          apiKey: googleMapsApiKey,
          version: 'weekly',
          libraries: ['geometry', 'places'],
        });

        await loader.load();
        
        if (!mapContainer.current) return;

        map.current = new google.maps.Map(mapContainer.current, {
          zoom: 13,
          center: { lat: 48.8566, lng: 2.3522 },
          mapTypeId: 'roadmap',
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: false,
          gestureHandling: 'greedy',
        });

        setIsMapLoaded(true);

        elevationService.current = new google.maps.ElevationService();
        directionsService.current = new google.maps.DirectionsService();

        // Si mode édition, charger l'itinéraire existant
        if (isEditMode && editRouteDataRef.current) {
          loadExistingRoute();
        } else {
          // Centrer sur la position utilisateur
          getCurrentPosition()
            .then((position) => {
              if (position) {
                map.current?.setCenter(position);
                map.current?.setZoom(14);
              }
            })
            .catch(() => {
              console.log('Position non disponible, centré sur Paris');
            });
        }

        // Créer le parcours au clic (via ref = toujours la logique à jour)
        map.current.addListener('click', (event: google.maps.MapMouseEvent) => {
          if (!event.latLng) return;
          void addWaypointRef.current(event.latLng);
        });

      } catch (error) {
        console.error('Erreur lors du chargement de la carte:', error);
        setMapError(true);
        toast.error("Erreur lors du chargement de la carte");
      }
    };

    initializeMap();
  }, [isMapLoaded, isEditMode]);

  // Ajouter un marqueur visuel pour chaque waypoint
  const addWaypointMarker = (latLng: google.maps.LatLng, index: number, mode: 'manual' | 'guided') => {
    if (!map.current) return;
    
    const marker = new google.maps.Marker({
      position: latLng,
      map: map.current,
      label: {
        text: String(index + 1),
        color: 'white',
        fontWeight: 'bold',
        fontSize: '12px'
      },
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: mode === 'manual' ? '#f97316' : '#3b82f6',
        fillOpacity: 1,
        strokeColor: 'white',
        strokeWeight: 2
      }
    });
    waypointMarkers.current.push(marker);
  };

  // Effacer tous les marqueurs
  const clearMarkers = () => {
    waypointMarkers.current.forEach(marker => marker.setMap(null));
    waypointMarkers.current = [];
  };

  // Effacer tous les segments
  const clearSegments = () => {
    segments.current.forEach(segment => segment.polyline.setMap(null));
    segments.current = [];
  };

  // Créer un segment manuel (ligne droite)
  const createManualSegment = (startPoint: google.maps.LatLng, endPoint: google.maps.LatLng): RouteSegment => {
    const coordinates = [startPoint, endPoint];
    
    const polyline = new google.maps.Polyline({
      path: coordinates,
      geodesic: true,
      strokeColor: '#f97316',
      strokeOpacity: 1.0,
      strokeWeight: 4,
      map: map.current,
    });

    return {
      startPoint,
      endPoint,
      mode: 'manual',
      polyline,
      coordinates
    };
  };

  // Créer un segment guidé (suivant les routes / chemins)
  const createGuidedSegment = async (startPoint: google.maps.LatLng, endPoint: google.maps.LatLng): Promise<RouteSegment | null> => {
    if (!directionsService.current || !map.current) return null;

    const requestRoute = (travelMode: google.maps.TravelMode) =>
      new Promise<google.maps.DirectionsResult>((resolve, reject) => {
        directionsService.current!.route(
          {
            origin: startPoint,
            destination: endPoint,
            travelMode,
          },
          (result, status) => {
            if (status === 'OK' && result?.routes?.[0]) {
              resolve(result);
            } else {
              reject(new Error(String(status)));
            }
          }
        );
      });

    const travelModes = [
      google.maps.TravelMode.WALKING,
      google.maps.TravelMode.BICYCLING,
      google.maps.TravelMode.DRIVING,
    ];

    let lastStatus = 'UNKNOWN';
    for (const mode of travelModes) {
      try {
        const result = await requestRoute(mode);
        const coordinates = buildPathFromDirectionsResult(result);
        if (coordinates.length >= 2) {
          const polyline = new google.maps.Polyline({
            path: coordinates,
            geodesic: false,
            strokeColor: '#3b82f6',
            strokeOpacity: 1.0,
            strokeWeight: 4,
            map: map.current,
          });

          return {
            startPoint,
            endPoint,
            mode: 'guided',
            polyline,
            coordinates,
          };
        }
      } catch (e: unknown) {
        lastStatus = e instanceof Error ? e.message : String(e);
        console.warn('[RouteCreation] Directions mode', mode, lastStatus);
      }
    }

    console.error('Erreur création segment guidé (tous modes):', lastStatus);
    toast.error("Route introuvable, tracé en ligne droite");
    return createManualSegment(startPoint, endPoint);
  };

  const addWaypoint = async (latLng: google.maps.LatLng) => {
    const currentMode = isManualModeRef.current ? 'manual' : 'guided';

    if (waypoints.current.length === 0) {
      // Premier point - juste ajouter le marqueur
      waypoints.current.push(latLng);
      addWaypointMarker(latLng, 0, currentMode);
      setWaypointCount(1);
    } else {
      // Points suivants - créer un segment depuis le dernier point
      const lastPoint = waypoints.current[waypoints.current.length - 1];
      waypoints.current.push(latLng);
      addWaypointMarker(latLng, waypoints.current.length - 1, currentMode);

      let newSegment: RouteSegment | null;
      
      if (currentMode === 'manual') {
        newSegment = createManualSegment(lastPoint, latLng);
      } else {
        newSegment = await createGuidedSegment(lastPoint, latLng);
      }

      if (newSegment) {
        segments.current.push(newSegment);
        setWaypointCount(waypoints.current.length);
        await updateElevationAndStats();
      }
    }
  };

  // Récupérer toutes les coordonnées de tous les segments
  const getAllCoordinates = (): google.maps.LatLng[] => {
    if (segments.current.length === 0) return [];
    
    const allCoords: google.maps.LatLng[] = [];
    segments.current.forEach((segment, index) => {
      if (index === 0) {
        allCoords.push(...segment.coordinates);
      } else {
        // Éviter les doublons de points de jonction
        allCoords.push(...segment.coordinates.slice(1));
      }
    });
    return allCoords;
  };

  // Mise à jour élévation ET stats en une seule fonction pour éviter race condition
  /** Retourne les valeurs fraîches pour l’export (évite un state React obsolète dans handleFinish). */
  const updateElevationAndStats = async (): Promise<{
    distanceKm: number;
    elevations: number[];
    elevationGain: number;
    elevationLoss: number;
  } | null> => {
    const allCoordinates = getAllCoordinates();
    if (allCoordinates.length === 0 || !elevationService.current) return null;

    // Distance = somme des segments réellement tracés (sans sur-échantillonnage)
    let distance = 0;
    for (let i = 0; i < allCoordinates.length - 1; i++) {
      distance += google.maps.geometry.spherical.computeDistanceBetween(
        allCoordinates[i],
        allCoordinates[i + 1]
      );
    }
    const distanceKm = distance / 1000;
    setTotalDistance(distanceKm);

    // Dénivelé : chemin densifié (indispensable pour le mode manuel = peu de points)
    const pathForElevation = densifyLatLngPath(allCoordinates);

    try {
      const numSamples = Math.min(512, Math.max(pathForElevation.length * 2, 96));

      const result = await new Promise<google.maps.ElevationResult[]>((resolve, reject) => {
        elevationService.current!.getElevationAlongPath(
          {
            path: pathForElevation,
            samples: numSamples,
          },
          (results, status) => {
            if (status === 'OK' && results) {
              resolve(results);
            } else {
              reject(new Error(`Elevation request failed: ${status}`));
            }
          }
        );
      });

      const elevations = result.map((r) => r.elevation);

      let elevationGain = 0;
      let elevationLoss = 0;
      for (let i = 1; i < elevations.length; i++) {
        const diff = elevations[i] - elevations[i - 1];
        if (diff > ELEV_NOISE_THRESHOLD_M) {
          elevationGain += diff;
        } else if (diff < -ELEV_NOISE_THRESHOLD_M) {
          elevationLoss += Math.abs(diff);
        }
      }

      const roundedGain = Math.round(elevationGain);
      const roundedLoss = Math.round(elevationLoss);
      setRouteElevations(elevations);
      setTotalElevationGain(roundedGain);
      setTotalElevationLoss(roundedLoss);
      setElevationChartCoords(resamplePathEvenly(pathForElevation, elevations.length));
      return {
        distanceKm,
        elevations,
        elevationGain: roundedGain,
        elevationLoss: roundedLoss,
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des altitudes:', error);
      setElevationChartCoords([]);
      setRouteElevations([]);
      setTotalElevationGain(0);
      setTotalElevationLoss(0);
      return {
        distanceKm,
        elevations: [],
        elevationGain: 0,
        elevationLoss: 0,
      };
    }
  };

  // Toggle mode - NE PAS recréer les segments existants
  const handleModeToggle = () => {
    const newMode = !isManualMode;
    setIsManualMode(newMode);
    isManualModeRef.current = newMode;
    toast.success(newMode ? "Mode manuel activé - prochains points en ligne droite" : "Mode guidé activé - prochains points sur routes");
  };

  const handleUndo = async () => {
    if (waypoints.current.length === 0) return;
    
    const removedWaypoint = waypoints.current.pop();
    const removedMarker = waypointMarkers.current.pop();
    let removedSegment: RouteSegment | null = null;
    
    // Supprimer le dernier marqueur
    if (removedMarker) removedMarker.setMap(null);
    
    // Supprimer le dernier segment s'il existe
    if (segments.current.length > 0) {
      removedSegment = segments.current.pop() || null;
      if (removedSegment) {
        removedSegment.polyline.setMap(null);
      }
    }
    
    // Sauvegarder pour redo
    if (removedWaypoint) {
      undoHistory.current.push({
        waypoint: removedWaypoint,
        segment: removedSegment,
        marker: removedMarker || null,
        mode: removedSegment?.mode || (isManualModeRef.current ? 'manual' : 'guided')
      });
      setCanRedo(true);
    }
    
    if (waypoints.current.length <= 1) {
      setRouteElevations([]);
      setElevationChartCoords([]);
      setTotalDistance(0);
      setTotalElevationGain(0);
      setTotalElevationLoss(0);
    } else {
      await updateElevationAndStats();
    }
    setWaypointCount(waypoints.current.length);
  };

  const handleRedo = async () => {
    if (undoHistory.current.length === 0) return;
    
    const lastUndo = undoHistory.current.pop();
    if (!lastUndo) return;
    
    // Restaurer le waypoint
    waypoints.current.push(lastUndo.waypoint);
    
    // Recréer le marqueur
    const markerIndex = waypoints.current.length - 1;
    addWaypointMarker(lastUndo.waypoint, markerIndex, lastUndo.mode);
    
    // Recréer le segment si nécessaire
    if (waypoints.current.length > 1) {
      const prevPoint = waypoints.current[waypoints.current.length - 2];
      let segment: RouteSegment | null = null;
      
      if (lastUndo.mode === 'guided') {
        segment = await createGuidedSegment(prevPoint, lastUndo.waypoint);
      } else {
        segment = createManualSegment(prevPoint, lastUndo.waypoint);
      }
      
      if (segment) {
        segments.current.push(segment);
      }
    }
    
    setCanRedo(undoHistory.current.length > 0);
    setWaypointCount(waypoints.current.length);
    await updateElevationAndStats();
  };

  const handleClear = () => {
    waypoints.current = [];
    clearMarkers();
    clearSegments();
    setRouteElevations([]);
    setElevationChartCoords([]);
    setTotalDistance(0);
    setTotalElevationGain(0);
    setTotalElevationLoss(0);
    setWaypointCount(0);
  };

  const handleRecenter = async () => {
    try {
      const position = await getCurrentPosition();
      if (position) {
        map.current?.setCenter(position);
        map.current?.setZoom(14);
      }
    } catch {
      toast.error("Position non disponible");
    }
  };

  const handleCancel = () => {
    navigate('/');
  };

  const handleFinish = async () => {
    if (waypoints.current.length < 2) {
      toast.error("Veuillez tracer un parcours avec au moins 2 points");
      return;
    }

    const freshStats = await updateElevationAndStats();
    if (!freshStats) {
      toast.error('Impossible de finaliser le parcours (élévation / distance)');
      return;
    }

    const allCoordinates = getAllCoordinates();
    
    // Déterminer si l'itinéraire est hybride ou purement manuel/guidé
    const hasManual = segments.current.some(s => s.mode === 'manual');
    const hasGuided = segments.current.some(s => s.mode === 'guided');
    const routeType = hasManual && hasGuided ? 'hybrid' : (hasManual ? 'manual' : 'guided');

    const coordinates = allCoordinates.map(coord => ({
      lat: coord.lat(),
      lng: coord.lng()
    }));

    // Sauvegarder les waypoints avec leur mode
    const waypointsData = waypoints.current.map((wp, index) => {
      // Trouver le mode du segment qui commence à ce waypoint
      const segmentMode = index < segments.current.length ? segments.current[index].mode : 'manual';
      return {
        lat: wp.lat(),
        lng: wp.lng(),
        mode: segmentMode
      };
    });

    // Mode édition : mettre à jour l'itinéraire existant directement
    if (isEditMode && editRouteDataRef.current && user) {
      try {
        const { error } = await supabase
          .from('routes')
          .update({
            coordinates,
            waypoints: waypointsData,
            total_distance: totalDistance * 1000,
            total_elevation_gain: totalElevationGain,
            total_elevation_loss: totalElevationLoss
          })
          .eq('id', editRouteDataRef.current.id)
          .eq('created_by', user.id);

        if (error) throw error;

        toast.success("Itinéraire modifié avec succès");
        navigate('/');
        return;
      } catch (error) {
        console.error('Erreur mise à jour itinéraire:', error);
        toast.error("Erreur lors de la modification");
        return;
      }
    }

    // Mode création : sauvegarder dans localStorage pour le dialog (valeurs fraîches, pas le state React)
    const routeData = {
      coordinates,
      waypoints: waypointsData,
      distance: freshStats.distanceKm,
      elevationGain: freshStats.elevationGain,
      elevationLoss: freshStats.elevationLoss,
      elevations: freshStats.elevations,
      routeType
    };

    localStorage.setItem('pendingRoute', JSON.stringify(routeData));
    
    // Retourner à la carte principale avec un paramètre pour ouvrir le dialog de sauvegarde
    navigate('/?saveRoute=true');
  };

  addWaypointRef.current = addWaypoint;

  return (
    <div className="relative h-full min-h-0 overflow-x-hidden bg-background">
      {/* Barre de navigation iOS compacte */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-background/95 backdrop-blur-md border-b border-border/30 pt-[var(--safe-area-top)]">
        <div className="flex items-center justify-between h-11 px-ios-2">
          <button
            onClick={handleCancel}
            className="flex items-center gap-ios-1 text-primary active:opacity-60 px-ios-2 py-ios-1"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-ios-headline">Retour</span>
          </button>
          <h1 className="text-ios-headline font-semibold text-foreground absolute left-1/2 -translate-x-1/2">
            {isEditMode ? "Modifier" : "Itinéraire"}
          </h1>
          <div className="flex items-center gap-ios-1">
            <Button
              onClick={handleFinish}
              size="icon"
              variant="ghost"
              className="h-9 w-9 rounded-full text-primary active:scale-95"
              title="Valider"
            >
              <Check className="h-5 w-5" />
            </Button>
            <Button
              onClick={handleClear}
              disabled={waypoints.current.length === 0}
              size="icon"
              variant="ghost"
              className="h-9 w-9 rounded-full text-destructive active:scale-95 disabled:opacity-30"
              title="Supprimer"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Carte plein écran */}
      <div ref={mapContainer} className="absolute inset-0 bg-secondary" data-tutorial="tutorial-route-creation-map" />

      {/* Loading / Error overlay */}
      {!isMapLoaded && !mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary z-[5]">
          <div className="flex flex-col items-center gap-ios-3">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-ios-subheadline text-muted-foreground">Chargement de la carte...</p>
          </div>
        </div>
      )}
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary z-[5]">
          <div className="flex flex-col items-center gap-ios-4 px-ios-6 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground" />
            <p className="text-ios-subheadline text-muted-foreground">Impossible de charger la carte. Vérifiez votre connexion.</p>
            <Button variant="outline" onClick={() => navigate(-1)}>Retour</Button>
          </div>
        </div>
      )}

      {/* Toggle Mode */}
      <div className="absolute left-ios-4 top-12 z-10">
        <div className="bg-background/90 backdrop-blur-md border border-border/50 rounded-ios-lg p-ios-1 shadow-lg flex gap-ios-1">
          <Button
            size="sm"
            variant={!isManualMode ? "default" : "ghost"}
            onClick={() => !isManualMode ? null : handleModeToggle()}
            className={`gap-2 ${!isManualMode ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'text-muted-foreground'}`}
          >
            <Route className="w-4 h-4" />
            Guidé
          </Button>
          <Button
            size="sm"
            variant={isManualMode ? "default" : "ghost"}
            onClick={() => isManualMode ? null : handleModeToggle()}
            className={`gap-2 ${isManualMode ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'text-muted-foreground'}`}
          >
            <MapPin className="w-4 h-4" />
            Manuel
          </Button>
        </div>
        <p className="text-ios-footnote text-muted-foreground mt-ios-1 text-center">
          {isManualMode ? "🛤️ Tracé libre hors-piste" : "🚶 Suit les chemins"}
        </p>
      </div>

      {/* Outils latéraux */}
      <div className="absolute right-ios-4 top-12 flex flex-col gap-ios-2 z-10">
        <Button
          size="icon"
          variant="outline"
          onClick={handleRecenter}
          className="bg-background/80 hover:bg-background/90 backdrop-blur-md border-border/50 shadow-lg"
          title="Recentrer"
        >
          <Navigation className="w-4 h-4" />
        </Button>
        
        <Button
          size="icon"
          variant="outline"
          onClick={handleUndo}
          disabled={waypoints.current.length === 0}
          className="bg-background/80 hover:bg-background/90 backdrop-blur-md border-border/50 shadow-lg disabled:opacity-50"
          title="Annuler dernier point"
        >
          <Undo className="w-4 h-4" />
        </Button>
        
        <Button
          size="icon"
          variant="outline"
          onClick={handleRedo}
          disabled={!canRedo}
          className="bg-background/80 hover:bg-background/90 backdrop-blur-md border-border/50 shadow-lg disabled:opacity-50"
          title="Rétablir"
        >
          <Redo className="w-4 h-4" />
        </Button>
        
        <Button
          size="icon"
          variant="outline"
          onClick={handleClear}
          disabled={waypoints.current.length === 0}
          className="bg-background/80 hover:bg-background/90 backdrop-blur-md border-border/50 shadow-lg disabled:opacity-50"
          title="Effacer tout"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Distance / D+ / D- + profil d'élévation : bas d'écran pour ne pas masquer Guidé / Manuel */}
      {/* Pas d’env(safe-area-inset-bottom) ici : le Layout réserve déjà tab bar + home indicator */}
      <div className="absolute bottom-0 left-0 right-0 z-10 flex flex-col gap-ios-2 pointer-events-none pb-4">
        <div className="pointer-events-auto px-ios-4 w-full flex flex-col gap-ios-2">
          {totalDistance > 0 && (
            <div className="bg-background/95 backdrop-blur-md border border-border/50 rounded-ios-lg px-ios-4 py-ios-2.5 shadow-lg">
              <div className="flex flex-wrap items-center justify-center gap-x-ios-4 gap-y-ios-1 text-ios-subheadline">
                <div className="flex items-center gap-ios-1">
                  <span className="text-muted-foreground">📏</span>
                  <span className="font-semibold text-foreground">{formatKm(totalDistance)}</span>
                </div>
                <div className="hidden sm:block w-px h-4 bg-border" />
                <div className="flex items-center gap-ios-1">
                  <span className="text-green-500">⬆️</span>
                  <span className="font-semibold text-foreground">D+ {totalElevationGain}m</span>
                </div>
                <div className="hidden sm:block w-px h-4 bg-border" />
                <div className="flex items-center gap-ios-1">
                  <span className="text-red-500">⬇️</span>
                  <span className="font-semibold text-foreground">D- {totalElevationLoss}m</span>
                </div>
              </div>
            </div>
          )}

          {routeElevations.length > 0 && (
            <div className="bg-background/80 backdrop-blur-md border border-border/50 rounded-lg shadow-lg overflow-hidden">
              <div
                className="flex items-center justify-between p-ios-2 cursor-pointer hover:bg-background/90 transition-colors"
                onClick={() => setShowElevationProfile(!showElevationProfile)}
              >
                <span className="text-ios-subheadline font-medium text-foreground">Profil d&apos;élévation</span>
                {showElevationProfile ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                )}
              </div>

              {showElevationProfile && (
                <div className="p-ios-4 pt-0 max-h-[40vh] overflow-y-auto">
                  <ElevationProfile elevations={routeElevations} coordinates={elevationChartCoords} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Instructions - seulement si pas encore de tracé */}
      {waypointCount === 0 && (
        <div className="absolute bottom-ios-4 left-1/2 transform -translate-x-1/2 z-10 bg-background/90 backdrop-blur-md border border-border/50 rounded-full px-ios-4 py-ios-2 shadow-lg">
          <p className="text-ios-subheadline text-foreground text-center">
            👆 Cliquez sur la carte pour tracer votre parcours
          </p>
        </div>
      )}
    </div>
  );
};

export default RouteCreation;
