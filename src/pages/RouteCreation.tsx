import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Undo, Redo, Trash2, Navigation, Route, MapPin, ArrowLeft, Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

import { ElevationProfile } from '@/components/ElevationProfile';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useDistanceUnits } from '@/contexts/DistanceUnitsContext';
import { fetchMapboxDirectionsPath } from '@/lib/mapboxDirections';
import { fetchElevationsForCoords, samplePathCoords } from '@/lib/openElevation';
import {
  distanceMeters,
  densifyMapCoords,
  resamplePathEvenlyMapCoords,
  type MapCoord,
} from '@/lib/geoUtils';
import { getMapboxAccessToken } from '@/lib/mapboxConfig';
import { createEmbeddedMapboxMap, fitMapToCoords, setOrUpdateLineLayer, removeLineLayer } from '@/lib/mapboxEmbed';

interface RouteSegment {
  startPoint: MapCoord;
  endPoint: MapCoord;
  mode: 'manual' | 'guided';
  layerSourceId: string;
  layerId: string;
  coordinates: MapCoord[];
}

interface EditRouteData {
  id: string;
  name: string;
  description: string;
  coordinates: Array<{ lat: number; lng: number }>;
  waypoints?: Array<{ lat: number; lng: number; mode: 'manual' | 'guided' }>;
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
  const map = useRef<mapboxgl.Map | null>(null);
  const segments = useRef<RouteSegment[]>([]);
  const waypoints = useRef<MapCoord[]>([]);
  const waypointMarkers = useRef<mapboxgl.Marker[]>([]);
  const segmentIdCounterRef = useRef(0);

  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [routeElevations, setRouteElevations] = useState<number[]>([]);
  const [showElevationProfile, setShowElevationProfile] = useState(true);
  const [totalDistance, setTotalDistance] = useState(0);
  const [totalElevationGain, setTotalElevationGain] = useState(0);
  const [totalElevationLoss, setTotalElevationLoss] = useState(0);
  const [elevationChartCoords, setElevationChartCoords] = useState<Array<{ lat: number; lng: number }>>([]);
  const [isManualMode, setIsManualMode] = useState(false);
  const [waypointCount, setWaypointCount] = useState(0);

  const undoHistory = useRef<
    Array<{
      waypoint: MapCoord;
      segment: RouteSegment | null;
      marker: mapboxgl.Marker | null;
      mode: 'manual' | 'guided';
    }>
  >([]);
  const [canRedo, setCanRedo] = useState(false);

  const isManualModeRef = useRef(false);

  useEffect(() => {
    isManualModeRef.current = isManualMode;
  }, [isManualMode]);

  const addWaypointRef = useRef<(latLng: MapCoord) => Promise<void>>(async () => {});

  function allocSegmentLayer(): { layerSourceId: string; layerId: string } {
    const n = segmentIdCounterRef.current++;
    return { layerSourceId: `rc-${n}-src`, layerId: `rc-${n}-ly` };
  }

  useEffect(() => {
    if (isEditMode) {
      const storedData = localStorage.getItem('editRouteData');
      if (storedData) {
        try {
          editRouteDataRef.current = JSON.parse(storedData) as EditRouteData;
        } catch (e) {
          console.error('Erreur parsing editRouteData:', e);
        }
      }
    }

    return () => {
      localStorage.removeItem('editRouteData');
    };
  }, [isEditMode]);

  const loadExistingRoute = async () => {
    if (!editRouteDataRef.current || !map.current) return;

    const savedWaypoints = editRouteDataRef.current.waypoints;
    const coords = editRouteDataRef.current.coordinates;

    if (savedWaypoints && savedWaypoints.length >= 2) {
      for (let i = 0; i < savedWaypoints.length; i++) {
        const wp = savedWaypoints[i]!;
        const latLng: MapCoord = { lat: wp.lat, lng: wp.lng };
        waypoints.current.push(latLng);
        addWaypointMarker(latLng, i, wp.mode || 'manual');

        if (i > 0) {
          const prevWp = savedWaypoints[i - 1]!;
          const prevLatLng: MapCoord = { lat: prevWp.lat, lng: prevWp.lng };

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
      const latLngs: MapCoord[] = coords.map((c) => ({ lat: c.lat, lng: c.lng }));

      waypoints.current.push(latLngs[0]!, latLngs[latLngs.length - 1]!);

      addWaypointMarker(latLngs[0]!, 0, 'manual');
      addWaypointMarker(latLngs[latLngs.length - 1]!, 1, 'manual');

      const { layerSourceId, layerId } = allocSegmentLayer();
      setOrUpdateLineLayer(map.current, layerSourceId, layerId, latLngs, {
        color: '#f97316',
        width: 4,
      });

      segments.current.push({
        startPoint: latLngs[0]!,
        endPoint: latLngs[latLngs.length - 1]!,
        mode: 'manual',
        layerSourceId,
        layerId,
        coordinates: latLngs,
      });
    }

    if (waypoints.current.length > 0) {
      fitMapToCoords(map.current, waypoints.current, 50);
    }

    await updateElevationAndStats();
    setWaypointCount(waypoints.current.length);

    toast.success("Itinéraire chargé - modifiez les points");
  };

  useEffect(() => {
    const initializeMap = () => {
      try {
        const tokenOk = !!getMapboxAccessToken();
        if (!tokenOk) {
          setMapError(true);
          toast.error('Carte : configurez VITE_MAPBOX_ACCESS_TOKEN');
          return;
        }
        if (!mapContainer.current) return;

        const m = createEmbeddedMapboxMap(mapContainer.current, {
          center: { lat: 48.8566, lng: 2.3522 },
          zoom: 13,
          interactive: true,
        });
        map.current = m;

        const ro = new ResizeObserver(() => {
          map.current?.resize();
        });
        ro.observe(mapContainer.current);

        m.once('load', () => {
          setIsMapLoaded(true);
          map.current?.resize();
          if (isEditMode && editRouteDataRef.current) {
            void loadExistingRoute();
          } else {
            getCurrentPosition()
              .then((position) => {
                if (position && map.current) {
                  map.current.jumpTo({ center: [position.lng, position.lat], zoom: 14 });
                }
              })
              .catch(() => {
                console.log('Position non disponible, centré sur Paris');
              });
          }
        });

        m.on('click', (e) => {
          void addWaypointRef.current({ lat: e.lngLat.lat, lng: e.lngLat.lng });
        });

        requestAnimationFrame(() => map.current?.resize());

        return () => {
          ro.disconnect();
        };
      } catch (error) {
        console.error('Erreur lors du chargement de la carte:', error);
        setMapError(true);
        toast.error('Erreur lors du chargement de la carte');
      }
    };

    const disposer = initializeMap();

    return () => {
      disposer?.();
      map.current?.remove();
      map.current = null;
    };
    // loadExistingRoute lit editRouteDataRef + map : dépendances incomplètes assumées (ré-init si isEditMode change).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode]);

  const addWaypointMarker = (latLng: MapCoord, index: number, mode: 'manual' | 'guided') => {
    if (!map.current) return;

    const wrap = document.createElement('div');
    wrap.style.display = 'flex';
    wrap.style.alignItems = 'center';
    wrap.style.justifyContent = 'center';
    wrap.style.width = '28px';
    wrap.style.height = '28px';
    wrap.style.borderRadius = '50%';
    wrap.style.background = mode === 'manual' ? '#f97316' : '#3b82f6';
    wrap.style.color = 'white';
    wrap.style.fontWeight = '800';
    wrap.style.fontSize = '12px';
    wrap.style.border = '2px solid white';
    wrap.style.boxShadow = '0 2px 6px rgba(0,0,0,0.25)';
    wrap.textContent = String(index + 1);

    const marker = new mapboxgl.Marker({ element: wrap }).setLngLat([latLng.lng, latLng.lat]).addTo(map.current);
    waypointMarkers.current.push(marker);
  };

  const clearMarkers = () => {
    waypointMarkers.current.forEach((m) => m.remove());
    waypointMarkers.current = [];
  };

  const clearSegments = () => {
    const m = map.current;
    if (!m) return;
    segments.current.forEach((segment) => removeLineLayer(m, segment.layerSourceId, segment.layerId));
    segments.current = [];
  };

  const createManualSegment = (startPoint: MapCoord, endPoint: MapCoord): RouteSegment => {
    const coordinates = [startPoint, endPoint];
    const { layerSourceId, layerId } = allocSegmentLayer();
    if (map.current) {
      setOrUpdateLineLayer(map.current, layerSourceId, layerId, coordinates, {
        color: '#f97316',
        width: 4,
      });
    }

    return {
      startPoint,
      endPoint,
      mode: 'manual',
      layerSourceId,
      layerId,
      coordinates,
    };
  };

  const createGuidedSegment = async (
    startPoint: MapCoord,
    endPoint: MapCoord,
  ): Promise<RouteSegment | null> => {
    if (!map.current) return null;

    const profiles = ['walking', 'cycling', 'driving'] as const;
    let path: MapCoord[] | null = null;

    for (const profile of profiles) {
      path = await fetchMapboxDirectionsPath([startPoint, endPoint], profile);
      if (path && path.length >= 2) break;
    }

    if (!path || path.length < 2) {
      console.error('Erreur création segment guidé (Mapbox Directions)');
      toast.error('Route introuvable, tracé en ligne droite');
      return createManualSegment(startPoint, endPoint);
    }

    const { layerSourceId, layerId } = allocSegmentLayer();
    setOrUpdateLineLayer(map.current, layerSourceId, layerId, path, {
      color: '#3b82f6',
      width: 4,
    });

    return {
      startPoint,
      endPoint,
      mode: 'guided',
      layerSourceId,
      layerId,
      coordinates: path,
    };
  };

  const addWaypoint = async (latLng: MapCoord) => {
    const currentMode = isManualModeRef.current ? 'manual' : 'guided';

    if (waypoints.current.length === 0) {
      waypoints.current.push(latLng);
      addWaypointMarker(latLng, 0, currentMode);
      setWaypointCount(1);
    } else {
      const lastPoint = waypoints.current[waypoints.current.length - 1]!;
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

  const getAllCoordinates = (): MapCoord[] => {
    if (segments.current.length === 0) return [];

    const allCoords: MapCoord[] = [];
    segments.current.forEach((segment, index) => {
      if (index === 0) {
        allCoords.push(...segment.coordinates);
      } else {
        allCoords.push(...segment.coordinates.slice(1));
      }
    });
    return allCoords;
  };

  const updateElevationAndStats = async (): Promise<{
    distanceKm: number;
    elevations: number[];
    elevationGain: number;
    elevationLoss: number;
  } | null> => {
    const allCoordinates = getAllCoordinates();
    if (allCoordinates.length === 0) return null;

    let distance = 0;
    for (let i = 0; i < allCoordinates.length - 1; i++) {
      distance += distanceMeters(allCoordinates[i]!, allCoordinates[i + 1]!);
    }
    const distanceKm = distance / 1000;
    setTotalDistance(distanceKm);

    const pathForElevation = densifyMapCoords(allCoordinates);

    try {
      const numSamples = Math.min(512, Math.max(pathForElevation.length * 2, 96));
      const sampled = samplePathCoords(pathForElevation, numSamples);
      const elevations = await fetchElevationsForCoords(sampled);

      let elevationGain = 0;
      let elevationLoss = 0;
      for (let i = 1; i < elevations.length; i++) {
        const diff = elevations[i]! - elevations[i - 1]!;
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
      setElevationChartCoords(resamplePathEvenlyMapCoords(pathForElevation, elevations.length));
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

  const handleModeToggle = () => {
    const newMode = !isManualMode;
    setIsManualMode(newMode);
    isManualModeRef.current = newMode;
    toast.success(
      newMode ? 'Mode manuel activé - prochains points en ligne droite' : 'Mode guidé activé - prochains points sur routes',
    );
  };

  const handleUndo = async () => {
    if (waypoints.current.length === 0) return;

    const removedWaypoint = waypoints.current.pop();
    const removedMarker = waypointMarkers.current.pop();
    let removedSegment: RouteSegment | null = null;

    if (removedMarker) removedMarker.remove();

    if (segments.current.length > 0) {
      removedSegment = segments.current.pop() || null;
      if (removedSegment && map.current) {
        removeLineLayer(map.current, removedSegment.layerSourceId, removedSegment.layerId);
      }
    }

    if (removedWaypoint) {
      undoHistory.current.push({
        waypoint: removedWaypoint,
        segment: removedSegment,
        marker: removedMarker || null,
        mode: removedSegment?.mode || (isManualModeRef.current ? 'manual' : 'guided'),
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

    waypoints.current.push(lastUndo.waypoint);

    const markerIndex = waypoints.current.length - 1;
    addWaypointMarker(lastUndo.waypoint, markerIndex, lastUndo.mode);

    if (waypoints.current.length > 1) {
      const prevPoint = waypoints.current[waypoints.current.length - 2]!;
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
        map.current?.flyTo({ center: [position.lng, position.lat], zoom: 14, duration: 600 });
      }
    } catch {
      toast.error('Position non disponible');
    }
  };

  const handleCancel = () => {
    navigate('/');
  };

  const handleFinish = async () => {
    if (waypoints.current.length < 2) {
      toast.error('Veuillez tracer un parcours avec au moins 2 points');
      return;
    }

    const freshStats = await updateElevationAndStats();
    if (!freshStats) {
      toast.error('Impossible de finaliser le parcours (élévation / distance)');
      return;
    }

    const allCoordinates = getAllCoordinates();

    const hasManual = segments.current.some((s) => s.mode === 'manual');
    const hasGuided = segments.current.some((s) => s.mode === 'guided');
    const routeType = hasManual && hasGuided ? 'hybrid' : hasManual ? 'manual' : 'guided';

    const coordinates = allCoordinates.map((coord) => ({
      lat: coord.lat,
      lng: coord.lng,
    }));

    const waypointsData = waypoints.current.map((wp, index) => {
      const segmentMode = index < segments.current.length ? segments.current[index]!.mode : 'manual';
      return {
        lat: wp.lat,
        lng: wp.lng,
        mode: segmentMode,
      };
    });

    if (isEditMode && editRouteDataRef.current && user) {
      try {
        const { error } = await supabase
          .from('routes')
          .update({
            coordinates,
            waypoints: waypointsData,
            total_distance: totalDistance * 1000,
            total_elevation_gain: totalElevationGain,
            total_elevation_loss: totalElevationLoss,
          })
          .eq('id', editRouteDataRef.current.id)
          .eq('created_by', user.id);

        if (error) throw error;

        toast.success('Itinéraire modifié avec succès');
        navigate('/');
        return;
      } catch (error) {
        console.error('Erreur mise à jour itinéraire:', error);
        toast.error('Erreur lors de la modification');
        return;
      }
    }

    const routeData = {
      coordinates,
      waypoints: waypointsData,
      distance: freshStats.distanceKm,
      elevationGain: freshStats.elevationGain,
      elevationLoss: freshStats.elevationLoss,
      elevations: freshStats.elevations,
      routeType,
    };

    localStorage.setItem('pendingRoute', JSON.stringify(routeData));

    navigate('/?saveRoute=true');
  };

  addWaypointRef.current = addWaypoint;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-hidden bg-background">
      <div className="relative z-20 shrink-0 bg-background/95 backdrop-blur-md border-b border-border/30 pt-[var(--safe-area-top)]">
        <div className="flex items-center justify-between h-11 px-ios-2">
          <button
            onClick={handleCancel}
            className="flex items-center gap-ios-1 text-primary active:opacity-60 px-ios-2 py-ios-1"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-ios-headline">Retour</span>
          </button>
          <h1 className="text-ios-headline font-semibold text-foreground absolute left-1/2 -translate-x-1/2">
            {isEditMode ? 'Modifier' : 'Itinéraire'}
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

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <div
          ref={mapContainer}
          className="relative z-[1] h-full min-h-0 w-full min-w-0"
          data-tutorial="tutorial-route-creation-map"
        />

      {!isMapLoaded && !mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary/90 z-[5]">
          <div className="flex flex-col items-center gap-ios-3">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-ios-subheadline text-muted-foreground">Chargement de la carte...</p>
          </div>
        </div>
      )}
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary/95 z-[5]">
          <div className="flex flex-col items-center gap-ios-4 px-ios-6 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground" />
            <p className="text-ios-subheadline text-muted-foreground">Impossible de charger la carte. Vérifiez VITE_MAPBOX_ACCESS_TOKEN.</p>
            <Button variant="outline" onClick={() => navigate(-1)}>
              Retour
            </Button>
          </div>
        </div>
      )}

      <div className="absolute left-ios-4 top-ios-4 z-10">
        <div className="bg-background/90 backdrop-blur-md border border-border/50 rounded-ios-lg p-ios-1 shadow-lg flex gap-ios-1">
          <Button
            size="sm"
            variant={!isManualMode ? 'default' : 'ghost'}
            onClick={() => (!isManualMode ? null : handleModeToggle())}
            className={`gap-2 ${!isManualMode ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'text-muted-foreground'}`}
          >
            <Route className="w-4 h-4" />
            Guidé
          </Button>
          <Button
            size="sm"
            variant={isManualMode ? 'default' : 'ghost'}
            onClick={() => (isManualMode ? null : handleModeToggle())}
            className={`gap-2 ${isManualMode ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'text-muted-foreground'}`}
          >
            <MapPin className="w-4 h-4" />
            Manuel
          </Button>
        </div>
        <p className="text-ios-footnote text-muted-foreground mt-ios-1 text-center">
          {isManualMode ? '🛤️ Tracé libre hors-piste' : '🚶 Suit les chemins'}
        </p>
      </div>

      <div className="absolute right-ios-4 top-ios-4 flex flex-col gap-ios-2 z-10">
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

      {waypointCount === 0 && (
        <div className="absolute bottom-ios-4 left-1/2 transform -translate-x-1/2 z-10 bg-background/90 backdrop-blur-md border border-border/50 rounded-full px-ios-4 py-ios-2 shadow-lg">
          <p className="text-ios-subheadline text-foreground text-center">👆 Cliquez sur la carte pour tracer votre parcours</p>
        </div>
      )}
      </div>
    </div>
  );
};

export default RouteCreation;
