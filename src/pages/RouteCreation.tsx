import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import type { Map, Marker } from 'mapbox-gl';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ChevronRight, Navigation, Plus, Undo, Redo, Trash2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAppContext } from '@/contexts/AppContext';
import { cn } from '@/lib/utils';

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
import {
  buildCoordinatesWithElevation,
  computeRouteStats,
  cumulativeDistanceAlongPath,
  sampleAlongPathAtDistance,
} from '@/lib/routePersistence';
import { createEmbeddedMapboxMap, fitMapToCoords, setOrUpdateLineLayer, removeLineLayer } from '@/lib/mapboxEmbed';
import { loadMapboxGl } from '@/lib/mapboxLazy';
import {
  MapboxBootErrorBody,
  MapboxBootLoadingBody,
} from '@/components/map/MapboxMapBootOverlay';
import { useNetworkQuality } from '@/lib/networkQuality';
import { Capacitor } from '@capacitor/core';
import { IosFixedPageHeaderShell } from '@/components/layout/IosFixedPageHeaderShell';
import { IosPageHeaderBar } from '@/components/layout/IosPageHeaderBar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMyRoutesList } from '@/hooks/useMyRoutesList';
import { ACTION_BLUE } from '@/components/discover/DiscoverChromeShell';

export type RouteCreationProps = {
  /** Intègre la même expérience que /route-create dans l’onglet Itinéraires de la page Découvrir (pas d’en-tête pleine page). */
  embedDiscover?: boolean;
};

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

type RouteDraftPayload = {
  savedAt: number;
  waypoints: Array<{ lat: number; lng: number; mode: 'manual' | 'guided' }>;
  isManualMode: boolean;
};

const ROUTE_DRAFT_STORAGE_KEY = 'runconnect_route_creation_draft_v1';

/** Réduit le bruit des petites oscillations du MNE (m). */
const ELEV_NOISE_THRESHOLD_M = 2;

export const RouteCreation = ({ embedDiscover = false }: RouteCreationProps) => {
  const navigate = useNavigate();
  const { pathname: routeCreationPathname } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { routes: myRoutesCatalog } = useMyRoutesList();
  const myRoutesCount = myRoutesCatalog.length;
  const { setBottomNavSuppressed } = useAppContext();
  const { formatKm, unit } = useDistanceUnits();

  const { getCurrentPosition } = useGeolocation();

  const isEditMode = searchParams.get('edit') === 'true';
  const editRouteDataRef = useRef<EditRouteData | null>(null);

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const segments = useRef<RouteSegment[]>([]);
  const waypoints = useRef<MapCoord[]>([]);
  const startMarkerRef = useRef<Marker | null>(null);
  const endMarkerRef = useRef<Marker | null>(null);
  const distanceMarkersRef = useRef<Marker[]>([]);
  const userLocationMarkerRef = useRef<Marker | null>(null);
  const segmentIdCounterRef = useRef(0);

  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [isSlowBoot, setIsSlowBoot] = useState(false);
  const [bootAttempt, setBootAttempt] = useState(0);
  const networkQuality = useNetworkQuality();
  const isOffline = networkQuality === 'offline';
  const [routeElevations, setRouteElevations] = useState<number[]>([]);
  const [mapStyleId, setMapStyleId] = useState(() => getStoredMapStyleId());
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [routeSaving, setRouteSaving] = useState(false);
  const scrubMarkerRef = useRef<Marker | null>(null);
  const [totalDistance, setTotalDistance] = useState(0);
  const [totalElevationGain, setTotalElevationGain] = useState(0);
  const [totalElevationLoss, setTotalElevationLoss] = useState(0);
  const [elevationChartCoords, setElevationChartCoords] = useState<Array<{ lat: number; lng: number }>>([]);
  const [isManualMode, setIsManualMode] = useState(false);
  const [waypointCount, setWaypointCount] = useState(0);
  const [elevationLoading, setElevationLoading] = useState(false);
  const [elevationAutoExpandToken, setElevationAutoExpandToken] = useState(0);
  const elevationRequestId = useRef(0);
  const [exitDraftDialogOpen, setExitDraftDialogOpen] = useState(false);
  const [pendingExitPath, setPendingExitPath] = useState<string | null>(null);
  const autoRestoreDoneRef = useRef(false);

  const undoHistory = useRef<
    Array<{
      waypoint: MapCoord;
      segment: RouteSegment | null;
      mode: 'manual' | 'guided';
    }>
  >([]);
  const [canRedo, setCanRedo] = useState(false);

  const isManualModeRef = useRef(false);

  useEffect(() => {
    if (mapError) {
      setIsSlowBoot(false);
      return;
    }
    if (isMapLoaded) {
      setIsSlowBoot(false);
      return;
    }
    const slowMs = networkQuality === 'slow' || networkQuality === 'offline' ? 4000 : 9000;
    const t = window.setTimeout(() => setIsSlowBoot(true), slowMs);
    return () => window.clearTimeout(t);
  }, [isMapLoaded, mapError, networkQuality, bootAttempt]);

  const retryMapBoot = useCallback(() => {
    setMapError(false);
    setIsSlowBoot(false);
    setIsMapLoaded(false);
    setBootAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    isManualModeRef.current = isManualMode;
  }, [isManualMode]);

  const addWaypointRef = useRef<(latLng: MapCoord) => Promise<void>>(async () => {});
  const previousWaypointCountRef = useRef(0);

  // MainTabsSwipeHost : la page reste montée en arrière-plan — se fier à la route active.
  const isActiveRouteCreation =
    embedDiscover ||
    routeCreationPathname === "/route-create" ||
    routeCreationPathname === "/route-creation";
  useEffect(() => {
    setBottomNavSuppressed("route-creation", isActiveRouteCreation);
    return () => setBottomNavSuppressed("route-creation", false);
  }, [isActiveRouteCreation, setBottomNavSuppressed]);

  function allocSegmentLayer(): { layerSourceId: string; layerId: string } {
    const n = segmentIdCounterRef.current++;
    return { layerSourceId: `rc-${n}-src`, layerId: `rc-${n}-ly` };
  }

  const ensureUserLocationMarker = useCallback(async (position: { lat: number; lng: number }) => {
    if (!map.current) return;
    if (userLocationMarkerRef.current) {
      userLocationMarkerRef.current.setLngLat([position.lng, position.lat]);
      return;
    }
    const marker = await createUserLocationMapboxMarker(position.lng, position.lat);
    if (!map.current) {
      marker.remove();
      return;
    }
    marker.addTo(map.current);
    userLocationMarkerRef.current = marker;
  }, []);

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
      await fitMapToCoords(map.current, waypoints.current, 50);
    }
    await refreshEndpointAndDistanceMarkers();

    await updateElevationAndStats('fast');
    setWaypointCount(waypoints.current.length);

    toast.success("Itinéraire chargé - modifiez les points");
  };

  useEffect(() => {
    let cancelled = false;
    let roCleanup: (() => void) | undefined;

    void (async () => {
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
        const m = await createEmbeddedMapboxMap(mapContainer.current, {
          center: { lat: 48.8566, lng: 2.3522 },
          zoom: 13,
          interactive: true,
          style: initialStyle,
        });
        if (cancelled) {
          m.remove();
          return;
        }
        map.current = m;

        const ro = new ResizeObserver(() => {
          map.current?.resize();
        });
        ro.observe(mapContainer.current);
        roCleanup = () => ro.disconnect();

        m.once('load', () => {
          setIsMapLoaded(true);
          map.current?.resize();
          if (isEditMode && editRouteDataRef.current) {
            void loadExistingRoute();
          } else {
            getCurrentPosition()
              .then((position) => {
                if (position && map.current) {
                  map.current.jumpTo({ center: [position.lng, position.lat], zoom: 12 });
                  void ensureUserLocationMarker(position);
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
      } catch (error) {
        console.error('Erreur lors du chargement de la carte:', error);
        setMapError(true);
        toast.error('Erreur lors du chargement de la carte');
      }
    })();

    return () => {
      cancelled = true;
      roCleanup?.();
      scrubMarkerRef.current?.remove();
      scrubMarkerRef.current = null;
      userLocationMarkerRef.current?.remove();
      userLocationMarkerRef.current = null;
      map.current?.remove();
      map.current = null;
      setIsMapLoaded(false);
    };
    // loadExistingRoute lit editRouteDataRef + map : dépendances incomplètes assumées (ré-init si isEditMode change).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, bootAttempt]);

  const clearMarkers = () => {
    startMarkerRef.current?.remove();
    startMarkerRef.current = null;
    endMarkerRef.current?.remove();
    endMarkerRef.current = null;
    distanceMarkersRef.current.forEach((m) => m.remove());
    distanceMarkersRef.current = [];
  };

  const refreshEndpointAndDistanceMarkers = useCallback(async () => {
    const m = map.current;
    if (!m) return;
    clearMarkers();
    if (waypoints.current.length === 0) return;

    const mapboxgl = await loadMapboxGl();
    const start = waypoints.current[0]!;
    const startEl = document.createElement('div');
    startEl.style.width = '18px';
    startEl.style.height = '18px';
    startEl.style.borderRadius = '9999px';
    startEl.style.background = '#34C759';
    startEl.style.border = '3px solid white';
    startEl.style.boxShadow = '0 4px 10px rgba(0,0,0,0.25)';
    startMarkerRef.current = new mapboxgl.Marker({ element: startEl })
      .setLngLat([start.lng, start.lat])
      .addTo(m);

    if (waypoints.current.length >= 2) {
      const end = waypoints.current[waypoints.current.length - 1]!;
      const finishEl = document.createElement('div');
      finishEl.style.width = '20px';
      finishEl.style.height = '20px';
      finishEl.style.display = 'flex';
      finishEl.style.alignItems = 'center';
      finishEl.style.justifyContent = 'center';
      finishEl.style.fontSize = '18px';
      finishEl.style.filter = 'drop-shadow(0 3px 6px rgba(0,0,0,0.25))';
      finishEl.textContent = '🏁';
      endMarkerRef.current = new mapboxgl.Marker({ element: finishEl, anchor: 'bottom' })
        .setLngLat([end.lng, end.lat])
        .addTo(m);
    }

    const allCoordinates = getAllCoordinates();
    if (allCoordinates.length < 2) return;
    const distCum = cumulativeDistanceAlongPath(allCoordinates);
    const totalMeters = distCum[distCum.length - 1] ?? 0;
    const spacingM = totalMeters >= 20_000 ? 5_000 : 2_000;
    for (let d = spacingM; d < totalMeters; d += spacingM) {
      const sample = sampleAlongPathAtDistance(allCoordinates, new Array(allCoordinates.length).fill(0), distCum, d);
      if (!sample) continue;
      const bubble = document.createElement('div');
      bubble.style.padding = '2px 7px';
      bubble.style.borderRadius = '9999px';
      bubble.style.background = 'rgba(17,24,39,0.84)';
      bubble.style.color = '#fff';
      bubble.style.fontSize = '11px';
      bubble.style.fontWeight = '600';
      bubble.style.letterSpacing = '0.01em';
      bubble.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
      bubble.textContent = `${Math.round(d / 1000)} km`;
      const distanceMarker = new mapboxgl.Marker({ element: bubble })
        .setLngLat([sample.lng, sample.lat])
        .addTo(m);
      distanceMarkersRef.current.push(distanceMarker);
    }
  }, []);

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

  // Sécurise l'affichage des traits à chaque rechargement de style Mapbox.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const ensureSegmentsVisible = () => {
      replayAllSegments();
      window.setTimeout(() => replayAllSegments(), 120);
      window.setTimeout(() => replayAllSegments(), 320);
    };
    m.on('style.load', ensureSegmentsVisible);
    return () => {
      m.off('style.load', ensureSegmentsVisible);
    };
  }, [isMapLoaded, replayAllSegments]);

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
      void (async () => {
        const mapboxgl = await loadMapboxGl();
        const mapInst = map.current;
        if (!mapInst || !meta) return;
        const el = document.createElement('div');
        el.style.width = '14px';
        el.style.height = '14px';
        el.style.borderRadius = '9999px';
        el.style.background = '#2563eb';
        el.style.border = '2px solid white';
        el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.35)';
        scrubMarkerRef.current = new mapboxgl.Marker({ element: el })
          .setLngLat([meta.lng, meta.lat])
          .addTo(mapInst);
      })();
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
      setWaypointCount(1);
      await refreshEndpointAndDistanceMarkers();
    } else {
      const lastPoint = waypoints.current[waypoints.current.length - 1]!;
      waypoints.current.push(latLng);

      let newSegment: RouteSegment | null;

      if (currentMode === 'manual') {
        newSegment = createManualSegment(lastPoint, latLng);
      } else {
        newSegment = await createGuidedSegment(lastPoint, latLng);
      }

      if (newSegment) {
        segments.current.push(newSegment);
        setWaypointCount(waypoints.current.length);
        await refreshEndpointAndDistanceMarkers();
        void updateElevationAndStats('fast');
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

  const updateElevationAndStats = async (
    quality: 'fast' | 'full' = 'fast'
  ): Promise<{
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

    const pathForElevation = densifyMapCoords(allCoordinates, quality === 'full' ? 7 : 18);
    const totalPathM = pathLengthMeters(pathForElevation);
    const stepM =
      quality === 'full'
        ? totalPathM > 90_000
          ? 11
          : totalPathM > 55_000
            ? 10
            : totalPathM > 28_000
              ? 9
              : 7
        : totalPathM > 90_000
          ? 80
          : totalPathM > 55_000
            ? 60
            : totalPathM > 28_000
              ? 42
              : totalPathM > 10_000
                ? 28
                : totalPathM > 3_000
                  ? 20
                  : 12;
    let sampled = resamplePathEveryMeters(pathForElevation, stepM);
    const MAX_POINTS =
      quality === 'full'
        ? 4000
        : totalPathM > 90_000
          ? 520
          : totalPathM > 28_000
            ? 420
            : totalPathM > 10_000
              ? 320
              : totalPathM > 3_000
                ? 240
                : 180;
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
  };

  const handleUndo = async () => {
    if (waypoints.current.length === 0) return;

    const removedWaypoint = waypoints.current.pop();
    let removedSegment: RouteSegment | null = null;

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
      void updateElevationAndStats('fast');
    }
    await refreshEndpointAndDistanceMarkers();
    setWaypointCount(waypoints.current.length);
  };

  const handleRedo = async () => {
    if (undoHistory.current.length === 0) return;

    const lastUndo = undoHistory.current.pop();
    if (!lastUndo) return;

    waypoints.current.push(lastUndo.waypoint);

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
    await refreshEndpointAndDistanceMarkers();
    void updateElevationAndStats('fast');
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

  useEffect(() => {
    if (waypointCount >= 2 && waypointCount > previousWaypointCountRef.current) {
      setElevationAutoExpandToken((t) => t + 1);
    }
    previousWaypointCountRef.current = waypointCount;
  }, [waypointCount]);

  const getWaypointModes = useCallback((): Array<{ lat: number; lng: number; mode: 'manual' | 'guided' }> => {
    return waypoints.current.map((wp, index) => {
      const mode = index > 0 && index - 1 < segments.current.length ? segments.current[index - 1]!.mode : 'manual';
      return { lat: wp.lat, lng: wp.lng, mode };
    });
  }, []);

  const clearRouteDraft = useCallback(() => {
    try {
      localStorage.removeItem(ROUTE_DRAFT_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const saveRouteDraft = useCallback(() => {
    const payload: RouteDraftPayload = {
      savedAt: Date.now(),
      waypoints: getWaypointModes(),
      isManualMode,
    };
    try {
      localStorage.setItem(ROUTE_DRAFT_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore
    }
  }, [getWaypointModes, isManualMode]);

  const restoreRouteDraft = useCallback(async () => {
    if (isEditMode) return;
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(ROUTE_DRAFT_STORAGE_KEY);
    } catch {
      raw = null;
    }
    if (!raw) {
      toast.error('Aucun brouillon trouvé');
      return;
    }
    try {
      const draft = JSON.parse(raw) as RouteDraftPayload;
      if (!Array.isArray(draft.waypoints) || draft.waypoints.length < 2) {
        toast.error('Brouillon invalide');
        return;
      }
      if (!map.current) {
        toast.error('Carte non prête');
        return;
      }
      handleClear();
      for (let i = 0; i < draft.waypoints.length; i += 1) {
        const wp = draft.waypoints[i]!;
        const latLng: MapCoord = { lat: Number(wp.lat), lng: Number(wp.lng) };
        waypoints.current.push(latLng);
        if (i > 0) {
          const prev = draft.waypoints[i - 1]!;
          const prevLatLng: MapCoord = { lat: Number(prev.lat), lng: Number(prev.lng) };
          const segment = wp.mode === 'guided'
            ? await createGuidedSegment(prevLatLng, latLng)
            : createManualSegment(prevLatLng, latLng);
          if (segment) segments.current.push(segment);
        }
      }
      // Fallback robuste : si aucun segment n'a pu être reconstruit (style/reseau),
      // on trace des segments manuels pour garantir l'affichage des traits.
      if (segments.current.length === 0 && waypoints.current.length >= 2) {
        for (let i = 1; i < waypoints.current.length; i += 1) {
          const prevPoint = waypoints.current[i - 1]!;
          const currPoint = waypoints.current[i]!;
          const seg = createManualSegment(prevPoint, currPoint);
          if (seg) segments.current.push(seg);
        }
      }
      setIsManualMode(!!draft.isManualMode);
      isManualModeRef.current = !!draft.isManualMode;
      setWaypointCount(waypoints.current.length);
      await refreshEndpointAndDistanceMarkers();
      await fitMapToCoords(map.current, waypoints.current, 50);
      // Rejouer les lignes après restauration + après éventuel refresh style.
      replayAllSegments();
      window.setTimeout(() => replayAllSegments(), 120);
      window.setTimeout(() => replayAllSegments(), 320);
      void updateElevationAndStats('fast');
      toast.success('Brouillon d’itinéraire restauré');
    } catch {
      toast.error('Impossible de restaurer le brouillon');
    }
  }, [isEditMode]);

  useEffect(() => {
    if (autoRestoreDoneRef.current) return;
    if (!isMapLoaded || isEditMode) return;
    if (searchParams.get('restoreDraft') !== '1') return;
    autoRestoreDoneRef.current = true;
    void restoreRouteDraft().finally(() => {
      const next = new URLSearchParams(searchParams);
      next.delete('restoreDraft');
      setSearchParams(next, { replace: true });
    });
  }, [isMapLoaded, isEditMode, restoreRouteDraft, searchParams, setSearchParams]);

  const requestExitWithRouteDraft = useCallback((to: string) => {
    if (isEditMode || waypoints.current.length < 2) {
      navigate(to);
      return;
    }
    setPendingExitPath(to);
    setExitDraftDialogOpen(true);
  }, [isEditMode, navigate]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let removed = false;
    const setup = async () => {
      try {
        const { App: CapApp } = await import('@capacitor/app');
        const listener = await CapApp.addListener('backButton', () => {
          requestExitWithRouteDraft('/');
        });
        return () => {
          if (!removed) {
            removed = true;
            listener.remove();
          }
        };
      } catch {
        return undefined;
      }
    };
    const cleanupPromise = setup();
    return () => {
      cleanupPromise.then((cleanup) => cleanup?.());
    };
  }, [requestExitWithRouteDraft]);

  const handleRecenter = useCallback(async () => {
    try {
      const position = await getCurrentPosition();
      if (position) {
        map.current?.flyTo({ center: [position.lng, position.lat], zoom: 12, duration: 600 });
        await ensureUserLocationMarker(position);
      }
    } catch {
      toast.error('Position non disponible');
    }
  }, [ensureUserLocationMarker, getCurrentPosition]);

  const handleZoomIn = useCallback(() => {
    const m = map.current;
    if (!m) return;
    const z = m.getZoom();
    m.easeTo({ zoom: Math.min(z + 1, 18), duration: 220 });
  }, []);

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
      const elevStats = await updateElevationAndStats('full');
      try {
        const elevationsForEdit = routeElevations.length >= 2 ? routeElevations : (elevStats?.elevations ?? []);
        const coordsWithElev = elevationsForEdit.length >= 2
          ? buildCoordinatesWithElevation(allCoordinates, elevationsForEdit)
          : coordinates;
        const stats = elevationsForEdit.length >= 2
          ? computeRouteStats(allCoordinates, elevationsForEdit)
          : null;
        const { error } = await supabase
          .from('routes')
          .update({
            coordinates: coordsWithElev,
            waypoints: waypointsData,
            total_distance: Math.round(pathLengthMeters(allCoordinates)),
            total_elevation_gain: stats?.elevationGain ?? elevStats?.elevationGain ?? totalElevationGain,
            total_elevation_loss: stats?.elevationLoss ?? elevStats?.elevationLoss ?? totalElevationLoss,
            min_elevation: stats?.minElevation ?? 0,
            max_elevation: stats?.maxElevation ?? 0,
          })
          .eq('id', editRouteDataRef.current.id)
          .eq('created_by', user.id);

        if (error) throw error;

        toast.success('Itinéraire modifié avec succès');
        navigate('/itinerary/my-routes', {
          state: { itineraryBackTo: routeCreationPathname },
        });
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

    void updateElevationAndStats('fast');
    setSaveDialogOpen(true);
  };

  const handleSaveRouteDialog = async (
    name: string,
    description: string,
    _createSession?: boolean,
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
      const refreshed = await updateElevationAndStats('full');
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
      isPublic: false,
    });
    setRouteSaving(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success('Itinéraire enregistré');
    setSaveDialogOpen(false);
    clearRouteDraft();
    navigate('/itinerary/my-routes', {
      state: { itineraryBackTo: routeCreationPathname },
    });
  };

  addWaypointRef.current = addWaypoint;

  const scrollInnerClassName = embedDiscover
    ? 'min-w-0 max-w-full space-y-3 pb-8 pt-1'
    : 'min-w-0 max-w-full space-y-3 px-4 pb-32 pt-3 ios-shell:px-2.5';

  const body = (
    <div className={scrollInnerClassName}>
            <div
              className="rounded-[14px] p-1 shadow-[0_0_0_0.5px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_0.5px_rgba(255,255,255,0.08)]"
              style={{ background: 'hsl(var(--card))' }}
            >
              <div className="flex">
                <button
                  type="button"
                  onClick={() => (isManualMode ? handleModeToggle() : undefined)}
                  className={cn(
                    'min-w-0 flex-1 rounded-lg py-[7px] text-center text-[13px] font-semibold transition-colors',
                    !isManualMode
                      ? 'bg-background text-foreground shadow-[0_0_0_0.5px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]'
                      : 'bg-transparent text-muted-foreground',
                  )}
                >
                  Guidé
                </button>
                <button
                  type="button"
                  onClick={() => (!isManualMode ? handleModeToggle() : undefined)}
                  className={cn(
                    'min-w-0 flex-1 rounded-lg py-[7px] text-center text-[13px] font-semibold transition-colors',
                    isManualMode
                      ? 'bg-background text-foreground shadow-[0_0_0_0.5px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]'
                      : 'bg-transparent text-muted-foreground',
                  )}
                >
                  Manuel
                </button>
              </div>
            </div>

            <p className="text-center text-[13px] text-muted-foreground">
              {isManualMode ? 'Tracé libre hors-piste' : 'Suit les chemins et sentiers'}
            </p>

            <div
              className="relative h-[420px] w-full min-w-0 overflow-hidden rounded-[18px] bg-card shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.25)]"
              data-tutorial="tutorial-route-creation-map"
            >
              <div ref={mapContainer} className="absolute inset-0 z-[1] min-h-0 w-full" />

              {!isMapLoaded && !mapError ? (
                <div
                  className="absolute inset-0 z-[5] flex items-center justify-center bg-background/80 backdrop-blur-sm"
                  role="status"
                  aria-live="polite"
                >
                  <MapboxBootLoadingBody
                    networkQuality={networkQuality}
                    isOffline={isOffline}
                    isSlowBoot={isSlowBoot}
                    onRetry={retryMapBoot}
                  />
                </div>
              ) : null}
              {mapError ? (
                <div className="absolute inset-0 z-[5] flex items-center justify-center bg-secondary/95 px-4 backdrop-blur-sm">
                  <MapboxBootErrorBody
                    message="Impossible de charger la carte. Vérifie ta connexion, la clé VITE_MAPBOX_ACCESS_TOKEN ou réessaie."
                    onRetry={retryMapBoot}
                    backLabel="Retour"
                    onBack={() => navigate(-1)}
                  />
                </div>
              ) : null}

              <div className="pointer-events-none absolute left-3 top-3 z-10 flex gap-2">
                <div className="map-stat-chip min-w-0">
                  <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Distance</div>
                  <div className="text-[17px] font-semibold tabular-nums tracking-tight text-foreground">
                    {formatKm(Math.max(0, totalDistance))}
                  </div>
                </div>
                <div className="map-stat-chip min-w-0">
                  <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Dénivelé</div>
                  <div className="text-[17px] font-semibold tabular-nums tracking-tight text-foreground">
                    {Math.round(totalElevationGain)} m
                  </div>
                </div>
              </div>

              <div className="absolute right-3 top-3 z-10 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => void handleRecenter()}
                  className="map-overlay-fab-btn"
                  aria-label="Recentrer sur ma position"
                >
                  <Navigation strokeWidth={2} aria-hidden />
                </button>
                <button type="button" onClick={handleZoomIn} className="map-overlay-fab-btn" aria-label="Zoom avant">
                  <Plus strokeWidth={2} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => void handleUndo()}
                  disabled={waypointCount === 0}
                  className="map-overlay-fab-btn"
                  aria-label="Annuler le dernier point"
                >
                  <Undo strokeWidth={2} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => void handleRedo()}
                  disabled={!canRedo}
                  className="map-overlay-fab-btn"
                  aria-label="Rétablir"
                >
                  <Redo strokeWidth={2} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={waypointCount === 0}
                  className="map-overlay-fab-btn"
                  aria-label="Effacer tout"
                >
                  <Trash2 strokeWidth={2} aria-hidden />
                </button>
                {!isEditMode ? (
                  <button
                    type="button"
                    onClick={() => navigate('/drafts/routes')}
                    className="map-overlay-fab-btn"
                    aria-label="Brouillons d’itinéraire"
                  >
                    <FileText strokeWidth={2} aria-hidden />
                  </button>
                ) : null}
                <div
                  className={cn(
                    'map-overlay-fab-shell',
                    '[&_.map-ios-colored-fab]:h-9 [&_.map-ios-colored-fab]:w-9 [&_.map-ios-colored-fab]:rounded-full [&_.map-ios-colored-fab]:bg-transparent [&_.map-ios-colored-fab]:shadow-none [&_.map-ios-colored-fab]:ring-0 [&_.map-ios-colored-fab]:ring-offset-0 [&_span]:!text-foreground [&_span_svg]:!stroke-current [&_span_svg]:!text-foreground [&_svg]:h-[15px] [&_svg]:w-[15px]',
                  )}
                >
                  <MapStyleSelector
                    currentStyle={mapStyleId}
                    onStyleChange={handleMapStyleChange}
                    panelAnchor="viewport-left"
                  />
                </div>
              </div>

              {waypointCount === 0 && !mapError ? (
                <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 max-w-[90%] -translate-x-1/2 rounded-full border border-border/50 bg-background/92 px-4 py-2 shadow-lg backdrop-blur-md">
                  <p className="text-center text-[15px] text-foreground">Touchez la carte pour tracer le parcours</p>
                </div>
              ) : null}
            </div>

            {waypointCount >= 2 ? (
              <RouteElevationPanel
                layout="itinerary"
                elevations={routeElevations}
                coords={elevationChartCoords}
                totalDistanceM={Math.max(0, totalDistance * 1000)}
                elevationGain={totalElevationGain}
                elevationLoss={totalElevationLoss}
                formatDistanceKm={formatKm}
                formatDistanceAlongPath={(m) => formatDistanceAlongPathMeters(m, unit)}
                isLoadingElevation={elevationLoading}
                defaultExpanded
                autoExpandToken={elevationAutoExpandToken}
                onScrub={handleElevationScrub}
              />
            ) : null}

            <button
              type="button"
              onClick={() => requestExitWithRouteDraft('/itinerary/my-routes')}
              className="flex min-w-0 w-full items-center gap-3 rounded-[14px] bg-card px-4 py-3.5 text-left shadow-[0_0_0_0.5px_rgba(0,0,0,0.04)] active:opacity-90 dark:shadow-[0_0_0_0.5px_rgba(255,255,255,0.08)] [-webkit-tap-highlight-color:transparent]"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-lg leading-none text-primary-foreground">
                📍
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[17px] font-normal leading-snug tracking-tight text-foreground">Mes itinéraires</div>
                <div className="mt-0.5 text-[13px] text-muted-foreground">
                  {myRoutesCount} enregistré{myRoutesCount !== 1 ? 's' : ''}
                </div>
              </div>
              <ChevronRight className="h-[18px] w-[18px] shrink-0 text-muted-foreground/45" aria-hidden />
            </button>

            {embedDiscover ? (
              <button
                type="button"
                onClick={() => void handleFinish()}
                className="mt-1 w-full touch-manipulation rounded-xl py-3.5 text-[16px] font-semibold text-white [-webkit-tap-highlight-color:transparent] active:opacity-90"
                style={{ background: ACTION_BLUE }}
              >
                Sauvegarder l&apos;itinéraire
              </button>
            ) : null}
          </div>
  );

  return (
    <>
      {embedDiscover ? (
        body
      ) : (
        <IosFixedPageHeaderShell
          className="flex h-full min-h-0 min-w-0 max-w-full flex-col overflow-x-hidden bg-secondary"
          headerWrapperClassName="shrink-0 bg-card"
          contentScroll
          scrollClassName="min-h-0 bg-secondary"
          header={
            <div className="min-w-0 border-b border-border bg-card/95 pt-[var(--safe-area-top)]">
              <IosPageHeaderBar
                leadingBack={{
                  onClick: () => requestExitWithRouteDraft('/'),
                  label: 'Découvrir',
                }}
                title="Itinéraire"
                sideClassName="w-[7.5rem]"
                right={
                  <button
                    type="button"
                    onClick={() => void handleFinish()}
                    className="min-w-[44px] py-1 text-right text-[17px] font-semibold text-primary [-webkit-tap-highlight-color:transparent] active:opacity-60"
                  >
                    OK
                  </button>
                }
              />
            </div>
          }
        >
          <ScrollArea className="h-full min-h-0 min-w-0 flex-1 overflow-x-hidden [&>div>div[style]]:!overflow-y-auto [&_.scrollbar]:hidden [&>div>div+div]:hidden">
            {body}
          </ScrollArea>
        </IosFixedPageHeaderShell>
      )}

      <RouteDialog
        isOpen={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        onSave={handleSaveRouteDialog}
        title="Enregistrer l'itinéraire"
        loading={routeSaving}
        showCreateSessionOption={false}
      />
      <AlertDialog open={exitDraftDialogOpen} onOpenChange={setExitDraftDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enregistrer le brouillon ?</AlertDialogTitle>
            <AlertDialogDescription>
              Ton itinéraire en cours n’est pas encore enregistré. Tu peux le reprendre plus tard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                const to = pendingExitPath;
                setPendingExitPath(null);
                if (to) navigate(to);
              }}
            >
              Quitter sans enregistrer
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                saveRouteDraft();
                toast.success('Brouillon d’itinéraire enregistré');
                const to = pendingExitPath;
                setPendingExitPath(null);
                if (to) navigate(to);
              }}
            >
              Enregistrer et quitter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default RouteCreation;
