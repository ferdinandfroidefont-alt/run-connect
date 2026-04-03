import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import { Button } from '@/components/ui/button';
import { Undo, Redo, Trash2, Navigation, Route, MapPin, ArrowLeft, Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

import { RouteDialog } from '@/components/RouteDialog';
import { MapStyleSelector } from '@/components/MapStyleSelector';
import {
  RouteElevationPanel,
  type RouteElevationScrubMeta,
} from '@/components/route-creation/RouteElevationPanel';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useDistanceUnits } from '@/contexts/DistanceUnitsContext';
import { formatDistanceAlongPathMeters } from '@/lib/distanceUnits';
import { fetchRoutedPathBetweenWaypoints } from '@/lib/mapboxDirections';
import { fetchElevationsForCoords } from '@/lib/openElevation';
import {
  distanceMeters,
  densifyMapCoords,
  pathLengthMeters,
  resamplePathEveryMeters,
  resamplePathEvenlyMapCoords,
  type MapCoord,
} from '@/lib/geoUtils';
import {
  getMapboxAccessToken,
  MAPBOX_NAVIGATION_DAY_STYLE,
  MAPBOX_STYLE_BY_UI_ID,
} from '@/lib/mapboxConfig';
import {
  clearMapStyleThemeRollback,
  getStoredMapStyleId,
  MAP_STYLE_THEME_SYNC_EVENT,
  persistMapStyleId,
} from '@/lib/mapboxMapStylePreference';
import { insertRouteRecord } from '@/lib/insertRouteRecord';
import { createEmbeddedMapboxMap, fitMapToCoords, setOrUpdateLineLayer, removeLineLayer } from '@/lib/mapboxEmbed';
import { cn } from '@/lib/utils';

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
  const { formatKm, unit } = useDistanceUnits();

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
  const [mapStyleId, setMapStyleId] = useState(() => getStoredMapStyleId());
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [routeSaving, setRouteSaving] = useState(false);
  const scrubMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [totalDistance, setTotalDistance] = useState(0);
  const [totalElevationGain, setTotalElevationGain] = useState(0);
  const [totalElevationLoss, setTotalElevationLoss] = useState(0);
  const [elevationChartCoords, setElevationChartCoords] = useState<Array<{ lat: number; lng: number }>>([]);
  const [isManualMode, setIsManualMode] = useState(false);
  const [waypointCount, setWaypointCount] = useState(0);
  const [elevationLoading, setElevationLoading] = useState(false);
  const elevationRequestId = useRef(0);

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

        const initialStyle =
          MAPBOX_STYLE_BY_UI_ID[mapStyleId] ?? MAPBOX_NAVIGATION_DAY_STYLE;
        const m = createEmbeddedMapboxMap(mapContainer.current, {
          center: { lat: 48.8566, lng: 2.3522 },
          zoom: 13,
          interactive: true,
          style: initialStyle,
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
      scrubMarkerRef.current?.remove();
      scrubMarkerRef.current = null;
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

  const replayAllSegments = () => {
    const m = map.current;
    if (!m || !m.isStyleLoaded()) return;
    segments.current.forEach((seg) => {
      setOrUpdateLineLayer(m, seg.layerSourceId, seg.layerId, seg.coordinates, {
        color: seg.mode === 'guided' ? '#3b82f6' : '#f97316',
        width: 4,
      });
    });
  };

  const handleMapStyleChange = useCallback((style: string) => {
    clearMapStyleThemeRollback();
    setMapStyleId(style);
    persistMapStyleId(style);
    const m = map.current;
    if (!m) return;
    const url = MAPBOX_STYLE_BY_UI_ID[style] ?? MAPBOX_NAVIGATION_DAY_STYLE;
    m.setStyle(url);
    m.once('style.load', () => {
      replayAllSegments();
      window.setTimeout(() => replayAllSegments(), 160);
    });
  }, []);

  useEffect(() => {
    const onThemeMapSync = () => {
      const id = getStoredMapStyleId();
      setMapStyleId(id);
      const m = map.current;
      if (!m) return;
      const url = MAPBOX_STYLE_BY_UI_ID[id] ?? MAPBOX_NAVIGATION_DAY_STYLE;
      m.setStyle(url);
      m.once('style.load', () => {
        replayAllSegments();
        window.setTimeout(() => replayAllSegments(), 160);
      });
    };
    window.addEventListener(MAP_STYLE_THEME_SYNC_EVENT, onThemeMapSync);
    return () => window.removeEventListener(MAP_STYLE_THEME_SYNC_EVENT, onThemeMapSync);
  }, []);

  const clearScrubMarker = () => {
    scrubMarkerRef.current?.remove();
    scrubMarkerRef.current = null;
  };

  const handleElevationScrub = useCallback((meta: RouteElevationScrubMeta | null) => {
    const m = map.current;
    if (!m) return;
    if (!meta) {
      clearScrubMarker();
      return;
    }
    if (!scrubMarkerRef.current) {
      const el = document.createElement('div');
      el.style.width = '14px';
      el.style.height = '14px';
      el.style.borderRadius = '9999px';
      el.style.background = '#2563eb';
      el.style.border = '2px solid white';
      el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.35)';
      scrubMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([meta.lng, meta.lat])
        .addTo(m);
    } else {
      scrubMarkerRef.current.setLngLat([meta.lng, meta.lat]);
    }
  }, []);

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

    const path = await fetchRoutedPathBetweenWaypoints(startPoint, endPoint);

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

    const reqId = ++elevationRequestId.current;
    setElevationLoading(true);

    const pathForElevation = densifyMapCoords(allCoordinates, 7);
    const totalPathM = pathLengthMeters(pathForElevation);
    /** Pas grossier sur lointain : ~7–11 m entre requêtes MNE selon longueur. */
    const stepM =
      totalPathM > 90_000 ? 11 : totalPathM > 55_000 ? 10 : totalPathM > 28_000 ? 9 : 7;
    let sampled = resamplePathEveryMeters(pathForElevation, stepM);
    const MAX_POINTS = 4000;
    if (sampled.length > MAX_POINTS) {
      sampled = resamplePathEvenlyMapCoords(sampled, MAX_POINTS);
    }

    try {
      const elevations = await fetchElevationsForCoords(sampled);

      if (reqId !== elevationRequestId.current) return null;

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
      // Même série que les altitudes (évite désalignement / profil « plat » sur longs tracés).
      setElevationChartCoords(sampled.map((c) => ({ lat: c.lat, lng: c.lng })));
      return {
        distanceKm,
        elevations,
        elevationGain: roundedGain,
        elevationLoss: roundedLoss,
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des altitudes:', error);
      if (reqId === elevationRequestId.current) {
        setElevationChartCoords([]);
        setRouteElevations([]);
        setTotalElevationGain(0);
        setTotalElevationLoss(0);
      }
      return {
        distanceKm,
        elevations: [],
        elevationGain: 0,
        elevationLoss: 0,
      };
    } finally {
      if (reqId === elevationRequestId.current) {
        setElevationLoading(false);
      }
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
    clearScrubMarker();
    elevationRequestId.current += 1;
    setElevationLoading(false);
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

    const allCoordinates = getAllCoordinates();

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
      const elevStats = await updateElevationAndStats();
      try {
        const { error } = await supabase
          .from('routes')
          .update({
            coordinates,
            waypoints: waypointsData,
            total_distance: Math.round(pathLengthMeters(allCoordinates)),
            total_elevation_gain: elevStats?.elevationGain ?? totalElevationGain,
            total_elevation_loss: elevStats?.elevationLoss ?? totalElevationLoss,
          })
          .eq('id', editRouteDataRef.current.id)
          .eq('created_by', user.id);

        if (error) throw error;

        toast.success('Itinéraire modifié avec succès');
        navigate('/itinerary/my-routes');
        return;
      } catch (error) {
        console.error('Erreur mise à jour itinéraire:', error);
        toast.error('Erreur lors de la modification');
        return;
      }
    }

    if (!user) {
      toast.error('Connectez-vous pour enregistrer un itinéraire');
      return;
    }

    void updateElevationAndStats();
    setSaveDialogOpen(true);
  };

  const handleSaveRouteDialog = async (
    name: string,
    description: string,
    _createSession?: boolean,
    isPublic?: boolean,
  ) => {
    if (!user) {
      toast.error('Connectez-vous pour enregistrer un itinéraire');
      return;
    }
    const pathCoords = getAllCoordinates();
    if (pathCoords.length < 2) {
      toast.error('Parcours invalide');
      return;
    }

    let elevationsForSave = routeElevations;
    if (elevationsForSave.length < 2) {
      const refreshed = await updateElevationAndStats();
      if (!refreshed || refreshed.elevations.length < 2) {
        toast.error('Impossible de calculer le dénivelé — réessayez dans un instant');
        return;
      }
      elevationsForSave = refreshed.elevations;
    }
    const waypointsData = waypoints.current.map((wp, index) => {
      const segmentMode = index < segments.current.length ? segments.current[index]!.mode : 'manual';
      return {
        lat: wp.lat,
        lng: wp.lng,
        mode: segmentMode,
      };
    });

    setRouteSaving(true);
    const result = await insertRouteRecord({
      userId: user.id,
      name,
      description,
      pathCoords,
      elevations: elevationsForSave,
      waypoints: waypointsData,
      isPublic: isPublic ?? false,
    });
    setRouteSaving(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success('Itinéraire enregistré');
    setSaveDialogOpen(false);
    navigate('/itinerary/my-routes');
  };

  addWaypointRef.current = addWaypoint;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-hidden bg-background">
      <div className="relative z-20 shrink-0 bg-background/95 backdrop-blur-md border-b border-border/30 pt-[var(--safe-area-top)]">
        <div className="flex h-11 items-center justify-between px-ios-2">
          <button
            onClick={handleCancel}
            className="flex items-center gap-ios-1 px-ios-2 py-ios-1 text-primary active:opacity-60"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-ios-headline">Retour</span>
          </button>
          <h1 className="absolute left-1/2 -translate-x-1/2 text-ios-headline font-semibold text-foreground">
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
        <div className="flex justify-end border-t border-border/20 px-ios-3 py-1.5">
          <button
            type="button"
            onClick={() => navigate('/itinerary/my-routes')}
            className="text-[13px] font-medium text-primary active:opacity-70"
          >
            Mes itinéraires
          </button>
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

        {/* Même bottom sheet « Style de carte » que l’accueil ; gabarit h-11 comme les boutons outline */}
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-ios-lg border border-border/50 bg-background/80 shadow-lg backdrop-blur-md hover:bg-background/90',
            '[&_.map-ios-colored-fab]:h-11 [&_.map-ios-colored-fab]:w-11 [&_.map-ios-colored-fab]:rounded-none [&_.map-ios-colored-fab]:border-0 [&_.map-ios-colored-fab]:bg-transparent [&_.map-ios-colored-fab]:shadow-none [&_.map-ios-colored-fab]:ring-0 [&_.map-ios-colored-fab]:ring-offset-0 [&_span]:!text-foreground/85 [&_span_svg]:!stroke-current [&_span_svg]:!text-foreground/85'
          )}
        >
          <MapStyleSelector currentStyle={mapStyleId} onStyleChange={handleMapStyleChange} />
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 flex flex-col gap-ios-2 pb-4">
        <div className="pointer-events-auto w-full px-ios-4">
          {waypointCount >= 2 && (
            <RouteElevationPanel
              elevations={routeElevations}
              coords={elevationChartCoords}
              totalDistanceM={Math.max(0, totalDistance * 1000)}
              elevationGain={totalElevationGain}
              elevationLoss={totalElevationLoss}
              formatDistanceKm={formatKm}
              formatDistanceAlongPath={(m) => formatDistanceAlongPathMeters(m, unit)}
              isLoadingElevation={elevationLoading}
              defaultExpanded={false}
              onScrub={handleElevationScrub}
            />
          )}
        </div>
      </div>

      {waypointCount === 0 && (
        <div className="absolute bottom-ios-4 left-1/2 z-10 -translate-x-1/2 rounded-full border border-border/50 bg-background/90 px-ios-4 py-ios-2 shadow-lg backdrop-blur-md">
          <p className="text-center text-ios-subheadline text-foreground">👆 Cliquez sur la carte pour tracer votre parcours</p>
        </div>
      )}
      </div>

      <RouteDialog
        isOpen={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        onSave={handleSaveRouteDialog}
        title="Enregistrer l'itinéraire"
        loading={routeSaving}
        showCreateSessionOption={false}
        showPublicToggle={true}
      />
    </div>
  );
};

export default RouteCreation;
