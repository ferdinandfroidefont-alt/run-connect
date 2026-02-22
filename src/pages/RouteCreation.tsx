import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader } from '@googlemaps/js-api-loader';
import { Button } from '@/components/ui/button';
import { X, Check, ChevronDown, ChevronUp, Undo, Redo, Trash2, Navigation, Route, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

import { ElevationProfile } from '@/components/ElevationProfile';
import { useGeolocation } from '@/hooks/useGeolocation';

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

export const RouteCreation = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
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
  const [isManualMode, setIsManualMode] = useState(false);
  
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
    
    toast.success("Itinéraire chargé - modifiez les points");
  };

  // Initialiser la carte
  useEffect(() => {
    if (!mapContainer.current || isMapLoaded) return;

    const initializeMap = async () => {
      try {
        const { data: apiKeyData } = await supabase.functions.invoke('google-maps-proxy', {
          body: { type: 'get-key' }
        });
        
        const googleMapsApiKey = apiKeyData?.apiKey || 'FALLBACK_KEY';
        
        const loader = new Loader({
          apiKey: googleMapsApiKey,
          version: 'weekly',
          libraries: ['geometry', 'places']
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

        // Créer le parcours au clic
        map.current.addListener('click', (event: google.maps.MapMouseEvent) => {
          if (!event.latLng) return;
          addWaypoint(event.latLng);
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

  // Créer un segment guidé (suivant les routes)
  const createGuidedSegment = async (startPoint: google.maps.LatLng, endPoint: google.maps.LatLng): Promise<RouteSegment | null> => {
    if (!directionsService.current || !map.current) return null;

    try {
      const result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
        directionsService.current!.route(
          {
            origin: startPoint,
            destination: endPoint,
            travelMode: google.maps.TravelMode.WALKING,
            optimizeWaypoints: false
          },
          (result, status) => {
            if (status === 'OK' && result) {
              resolve(result);
            } else {
              reject(new Error(`Directions request failed: ${status}`));
            }
          }
        );
      });

      const coordinates = result.routes[0].overview_path;
      
      const polyline = new google.maps.Polyline({
        path: coordinates,
        geodesic: true,
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
        coordinates
      };
    } catch (error) {
      console.error('Erreur création segment guidé:', error);
      // Fallback vers segment manuel si guidé échoue
      toast.error("Route introuvable, tracé en ligne droite");
      return createManualSegment(startPoint, endPoint);
    }
  };

  const addWaypoint = async (latLng: google.maps.LatLng) => {
    // Utiliser la ref pour obtenir la valeur actuelle (pas stale)
    const currentMode = isManualModeRef.current ? 'manual' : 'guided';
    console.log('addWaypoint - mode actuel:', currentMode, 'isManualModeRef:', isManualModeRef.current);
    
    if (waypoints.current.length === 0) {
      // Premier point - juste ajouter le marqueur
      waypoints.current.push(latLng);
      addWaypointMarker(latLng, 0, currentMode);
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
  const updateElevationAndStats = async () => {
    const allCoordinates = getAllCoordinates();
    if (allCoordinates.length === 0 || !elevationService.current) return;

    // Calculer d'abord la distance totale
    let distance = 0;
    for (let i = 0; i < allCoordinates.length - 1; i++) {
      distance += google.maps.geometry.spherical.computeDistanceBetween(
        allCoordinates[i],
        allCoordinates[i + 1]
      );
    }
    setTotalDistance(distance / 1000);

    try {
      // Augmenter le nombre d'échantillons pour plus de précision
      const numSamples = Math.min(512, Math.max(allCoordinates.length, 100));
      
      const result = await new Promise<google.maps.ElevationResult[]>((resolve, reject) => {
        elevationService.current!.getElevationAlongPath(
          {
            path: allCoordinates,
            samples: numSamples
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

      const elevations = result.map(r => r.elevation);
      
      // Calculer D+ et D- AVANT setState pour éviter race condition
      let elevationGain = 0;
      let elevationLoss = 0;
      for (let i = 1; i < elevations.length; i++) {
        const diff = elevations[i] - elevations[i - 1];
        if (diff > 0) {
          elevationGain += diff;
        } else {
          elevationLoss += Math.abs(diff);
        }
      }
      
      // Mettre à jour tous les états en même temps
      setRouteElevations(elevations);
      setTotalElevationGain(Math.round(elevationGain));
      setTotalElevationLoss(Math.round(elevationLoss));
      
    } catch (error) {
      console.error('Erreur lors de la récupération des altitudes:', error);
    }
  };

  // Toggle mode - NE PAS recréer les segments existants
  const handleModeToggle = () => {
    const newMode = !isManualMode;
    setIsManualMode(newMode);
    isManualModeRef.current = newMode; // Mettre à jour la ref aussi
    console.log('Mode toggle - nouveau mode:', newMode ? 'manual' : 'guided');
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
      setTotalDistance(0);
      setTotalElevationGain(0);
      setTotalElevationLoss(0);
    } else {
      await updateElevationAndStats();
    }
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
    await updateElevationAndStats();
  };

  const handleClear = () => {
    waypoints.current = [];
    clearMarkers();
    clearSegments();
    setRouteElevations([]);
    setTotalDistance(0);
    setTotalElevationGain(0);
    setTotalElevationLoss(0);
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

    // Mode création : sauvegarder dans localStorage pour le dialog
    const routeData = {
      coordinates,
      waypoints: waypointsData,
      distance: totalDistance,
      elevationGain: totalElevationGain,
      elevationLoss: totalElevationLoss,
      elevations: routeElevations,
      routeType
    };

    localStorage.setItem('pendingRoute', JSON.stringify(routeData));
    
    // Retourner à la carte principale avec un paramètre pour ouvrir le dialog de sauvegarde
    navigate('/?saveRoute=true');
  };

   return (
    <div className="fixed inset-0 bg-background z-50 bg-pattern overflow-x-hidden">
      {/* Barre supérieure minimaliste */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-background/95 to-transparent backdrop-blur-sm border-b border-border/30 p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <span className="text-2xl">✏️</span>
            {isEditMode ? "Modifier le tracé" : "Mode création d'itinéraire"}
          </h1>
          
          <div className="flex flex-col items-end gap-1">
            <Button
              size="sm"
              onClick={handleFinish}
              className="bg-primary/90 hover:bg-primary backdrop-blur-sm w-28"
            >
              <Check className="w-4 h-4 mr-2" />
              Terminer
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              className="bg-background/80 hover:bg-background/90 backdrop-blur-sm border border-border/50 w-28"
            >
              <X className="w-4 h-4 mr-2" />
              Annuler
            </Button>
          </div>
        </div>
      </div>

      {/* Carte plein écran */}
      <div ref={mapContainer} className="absolute inset-0 bg-secondary" />

      {/* Loading / Error overlay */}
      {!isMapLoaded && !mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary z-[5]">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Chargement de la carte...</p>
          </div>
        </div>
      )}
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary z-[5]">
          <div className="flex flex-col items-center gap-4 px-6 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Impossible de charger la carte. Vérifiez votre connexion.</p>
            <Button variant="outline" onClick={() => navigate(-1)}>Retour</Button>
          </div>
        </div>
      )}

      {/* Toggle Mode */}
      <div className="absolute left-4 top-24 z-10">
        <div className="bg-background/90 backdrop-blur-md border border-border/50 rounded-xl p-1 shadow-lg flex gap-1">
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
        <p className="text-xs text-muted-foreground mt-1 text-center">
          {isManualMode ? "🛤️ Tracé libre hors-piste" : "🚶 Suit les chemins"}
        </p>
      </div>

      {/* Outils latéraux */}
      <div className="absolute right-4 top-24 flex flex-col gap-2 z-10">
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

      {/* Stats flottantes */}
      {totalDistance > 0 && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-10 bg-background/90 backdrop-blur-md border border-border/50 rounded-xl px-4 py-2 shadow-lg">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">📏</span>
              <span className="font-semibold text-foreground">{totalDistance.toFixed(2)} km</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-1">
              <span className="text-green-500">⬆️</span>
              <span className="font-semibold text-foreground">D+ {totalElevationGain}m</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-1">
              <span className="text-red-500">⬇️</span>
              <span className="font-semibold text-foreground">D- {totalElevationLoss}m</span>
            </div>
          </div>
        </div>
      )}

      {/* Profil d'élévation */}
      {routeElevations.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 z-10">
          <div className="mx-4 mb-4">
            <div className="bg-background/80 backdrop-blur-md border border-border/50 rounded-lg shadow-lg overflow-hidden">
              <div 
                className="flex items-center justify-between p-2 cursor-pointer hover:bg-background/90 transition-colors"
                onClick={() => setShowElevationProfile(!showElevationProfile)}
              >
                <span className="text-sm font-medium text-foreground">Profil d'élévation</span>
                {showElevationProfile ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              
              {showElevationProfile && (
                <div className="p-4 pt-0">
                  <ElevationProfile 
                    elevations={routeElevations}
                    coordinates={getAllCoordinates().map(c => ({ lat: c.lat(), lng: c.lng() }))}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Instructions - seulement si pas encore de tracé */}
      {waypoints.current.length === 0 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 bg-background/90 backdrop-blur-md border border-border/50 rounded-full px-4 py-2 shadow-lg">
          <p className="text-sm text-foreground text-center">
            👆 Cliquez sur la carte pour tracer votre parcours
          </p>
        </div>
      )}
    </div>
  );
};

export default RouteCreation;
