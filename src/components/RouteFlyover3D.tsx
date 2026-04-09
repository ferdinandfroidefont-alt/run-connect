import { useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { RouteFlyoverHud } from '@/components/RouteFlyoverHud';
import { useRouteFlyoverPlayback } from '@/hooks/useRouteFlyoverPlayback';
import { getMapboxAccessToken, MAPBOX_STYLE_BY_UI_ID } from '@/lib/mapboxConfig';
import type { MapCoord } from '@/lib/geoUtils';
import { clamp, lineStringFeature, multiPointFeature, normalizeAngleDiff, pointFeature } from '@/lib/routeFlyover';
import { cn } from '@/lib/utils';

type RouteFlyover3DProps = {
  coordinates: MapCoord[];
  elevations: number[];
  autoPlay?: boolean;
  elevationExaggeration?: number;
  className?: string;
  routeName?: string;
  routeStats?: {
    totalDistance: number;
    elevationGain: number;
    elevationLoss: number;
  } | null;
};

const BASE_SOURCE_ID = 'route-flyover-base';
const TRAVELED_SOURCE_ID = 'route-flyover-traveled';
const POINT_SOURCE_ID = 'route-flyover-point';
const ENDPOINT_SOURCE_ID = 'route-flyover-endpoints';

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

export function RouteFlyover3D({
  coordinates,
  elevations,
  autoPlay = false,
  className,
  routeName,
  routeStats,
}: RouteFlyover3DProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapReadyRef = useRef(false);
  const lastCameraUpdateRef = useRef(0);
  const smoothedCenterRef = useRef<MapCoord | null>(null);
  const smoothedBearingRef = useRef<number | null>(null);
  const smoothedPitchRef = useRef<number | null>(null);
  const smoothedZoomRef = useRef<number | null>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const playback = useRouteFlyoverPlayback({
    coordinates,
    elevations,
    routeStats,
    autoPlay,
  });

  const endpoints = useMemo(() => {
    if (playback.flyoverCoordinates.length < 2) return [];
    return [
      playback.flyoverCoordinates[0]!,
      playback.flyoverCoordinates[playback.flyoverCoordinates.length - 1]!,
    ];
  }, [playback.flyoverCoordinates]);

  const initialFrame = useMemo(
    () => playback.frame,
    // Pose initiale figée pour éviter de recréer la carte pendant l'animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [playback.flyoverCoordinates],
  );

  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || playback.flyoverCoordinates.length < 2) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      mapRef.current?.resize();
    });
    resizeObserver.observe(container);

    const token = getMapboxAccessToken();
    if (!token) {
      setMapError('Token Mapbox manquant.');
      resizeObserver.disconnect();
      return;
    }

    mapboxgl.accessToken = token;
    setSceneReady(false);
    setMapError(null);

    /** Même base que le mode 3D Accueil (`standard3d` — bâtiments / rendu Mapbox Standard). */
    const map = new mapboxgl.Map({
      container,
      style: MAPBOX_STYLE_BY_UI_ID.standard3d,
      center: [initialFrame.focusCenter.lng, initialFrame.focusCenter.lat],
      zoom: initialFrame.zoom,
      pitch: initialFrame.pitch,
      bearing: initialFrame.bearing,
      interactive: false,
      attributionControl: false,
      antialias: true,
      pitchWithRotate: false,
      renderWorldCopies: false,
    });
    mapRef.current = map;

    const scheduleResizePass = () => {
      window.requestAnimationFrame(() => map.resize());
      window.setTimeout(() => map.resize(), 100);
      window.setTimeout(() => map.resize(), 350);
      window.setTimeout(() => map.resize(), 900);
    };

    const bootScene = () => {
      const m = mapRef.current;
      if (!m || mapReadyRef.current) return;

      try {
      m.addSource(BASE_SOURCE_ID, {
        type: 'geojson',
        data: lineStringFeature(playback.flyoverCoordinates),
      });
      m.addSource(TRAVELED_SOURCE_ID, {
        type: 'geojson',
        data: lineStringFeature([playback.frame.currentPosition]),
      });
      m.addSource(POINT_SOURCE_ID, {
        type: 'geojson',
        data: pointFeature(playback.frame.currentPosition),
      });
      m.addSource(ENDPOINT_SOURCE_ID, {
        type: 'geojson',
        data: multiPointFeature(endpoints),
      });

      /** Slots requis pour Mapbox Standard (GL v3) — sinon tracé invisible / rendu incorrect. */
      const slot = 'top' as const;

      m.addLayer({
        id: `${BASE_SOURCE_ID}-shadow`,
        type: 'line',
        source: BASE_SOURCE_ID,
        slot,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#ffffff',
          'line-width': 7,
          'line-opacity': 0.14,
        },
      });

      m.addLayer({
        id: `${BASE_SOURCE_ID}-line`,
        type: 'line',
        source: BASE_SOURCE_ID,
        slot,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#7dd3fc',
          'line-width': 4.5,
          'line-opacity': 0.28,
        },
      });

      m.addLayer({
        id: `${TRAVELED_SOURCE_ID}-glow`,
        type: 'line',
        source: TRAVELED_SOURCE_ID,
        slot,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#38bdf8',
          'line-width': 11,
          'line-opacity': 0.24,
          'line-blur': 1.1,
        },
      });

      m.addLayer({
        id: `${TRAVELED_SOURCE_ID}-line`,
        type: 'line',
        source: TRAVELED_SOURCE_ID,
        slot,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#f97316',
          'line-width': 5.5,
          'line-opacity': 0.98,
        },
      });

      m.addLayer({
        id: `${ENDPOINT_SOURCE_ID}-halo`,
        type: 'circle',
        source: ENDPOINT_SOURCE_ID,
        slot,
        paint: {
          'circle-radius': 10,
          'circle-color': '#ffffff',
          'circle-opacity': 0.22,
        },
      });

      m.addLayer({
        id: `${ENDPOINT_SOURCE_ID}-dot`,
        type: 'circle',
        source: ENDPOINT_SOURCE_ID,
        slot,
        paint: {
          'circle-radius': 5.5,
          'circle-color': '#ffffff',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
          'circle-opacity': 0.9,
        },
      });

      m.addLayer({
        id: `${POINT_SOURCE_ID}-halo`,
        type: 'circle',
        source: POINT_SOURCE_ID,
        slot,
        paint: {
          'circle-radius': 18,
          'circle-color': '#38bdf8',
          'circle-opacity': 0.24,
          'circle-blur': 0.75,
        },
      });

      m.addLayer({
        id: `${POINT_SOURCE_ID}-dot`,
        type: 'circle',
        source: POINT_SOURCE_ID,
        slot,
        paint: {
          'circle-radius': 6,
          'circle-color': '#ffffff',
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#0ea5e9',
        },
      });

      smoothedCenterRef.current = initialFrame.focusCenter;
      smoothedBearingRef.current = initialFrame.bearing;
      smoothedPitchRef.current = initialFrame.pitch;
      smoothedZoomRef.current = initialFrame.zoom;
      mapReadyRef.current = true;

      scheduleResizePass();
      m.easeTo({
        center: [initialFrame.focusCenter.lng, initialFrame.focusCenter.lat],
        bearing: initialFrame.bearing,
        pitch: initialFrame.pitch,
        zoom: initialFrame.zoom,
        duration: 1200,
        essential: true,
        easing: easeOutQuart,
      });
      } catch (err) {
        const msg =
          err instanceof Error && err.message.trim()
            ? err.message
            : 'Impossible d’afficher le survol sur la carte 3D.';
        setMapError(msg);
      }
    };

    map.on('error', (event) => {
      const message =
        typeof event.error?.message === 'string' && event.error.message.trim()
          ? event.error.message
          : 'La carte Mapbox n’a pas pu se charger.';
      setMapError(message);
    });

    map.on('idle', () => {
      setSceneReady(true);
      map.resize();
    });

    /** Standard (mapbox://styles/mapbox/standard) : attendre style.load, pas load seul. */
    if (map.isStyleLoaded()) {
      bootScene();
    } else {
      map.once('style.load', bootScene);
    }

    return () => {
      mapReadyRef.current = false;
      lastCameraUpdateRef.current = 0;
      smoothedCenterRef.current = null;
      smoothedBearingRef.current = null;
      smoothedPitchRef.current = null;
      smoothedZoomRef.current = null;
      resizeObserver.disconnect();
      setSceneReady(false);
      map.remove();
      mapRef.current = null;
    };
  }, [endpoints, initialFrame, playback.flyoverCoordinates]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;

    const traveledPath = playback.flyoverCoordinates.slice(0, playback.frame.segmentIndex + 1);
    traveledPath.push(playback.frame.currentPosition);

    if (map.getSource(TRAVELED_SOURCE_ID)) {
      (map.getSource(TRAVELED_SOURCE_ID) as mapboxgl.GeoJSONSource).setData(lineStringFeature(traveledPath));
    }
    if (map.getSource(POINT_SOURCE_ID)) {
      (map.getSource(POINT_SOURCE_ID) as mapboxgl.GeoJSONSource).setData(pointFeature(playback.frame.currentPosition));
    }

    const pulse = (Math.sin(performance.now() / 280) + 1) / 2;
    if (map.getLayer(`${POINT_SOURCE_ID}-halo`)) {
      map.setPaintProperty(`${POINT_SOURCE_ID}-halo`, 'circle-radius', 14 + pulse * 8);
      map.setPaintProperty(`${POINT_SOURCE_ID}-halo`, 'circle-opacity', 0.12 + pulse * 0.16);
    }

    const currentCenter = smoothedCenterRef.current ?? playback.frame.focusCenter;
    const currentBearing = smoothedBearingRef.current ?? playback.frame.bearing;
    const currentPitch = smoothedPitchRef.current ?? playback.frame.pitch;
    const currentZoom = smoothedZoomRef.current ?? playback.frame.zoom;

    const cameraLerp = playback.isPlaying ? 0.2 : 1;
    smoothedCenterRef.current = {
      lat: currentCenter.lat + (playback.frame.focusCenter.lat - currentCenter.lat) * cameraLerp,
      lng: currentCenter.lng + (playback.frame.focusCenter.lng - currentCenter.lng) * cameraLerp,
    };
    smoothedBearingRef.current =
      currentBearing + normalizeAngleDiff(playback.frame.bearing - currentBearing) * (playback.isPlaying ? 0.18 : 1);
    smoothedPitchRef.current = currentPitch + (playback.frame.pitch - currentPitch) * (playback.isPlaying ? 0.18 : 1);
    smoothedZoomRef.current = currentZoom + (playback.frame.zoom - currentZoom) * (playback.isPlaying ? 0.12 : 1);

    const now = performance.now();
    const shouldUpdateCamera =
      !lastCameraUpdateRef.current ||
      !playback.isPlaying ||
      now - lastCameraUpdateRef.current > 220 ||
      playback.progress === 0 ||
      playback.progress === 1;

    if (shouldUpdateCamera) {
      map.stop();
      map.easeTo({
        center: [smoothedCenterRef.current.lng, smoothedCenterRef.current.lat],
        bearing: smoothedBearingRef.current,
        pitch: clamp(smoothedPitchRef.current, 62, 74),
        zoom: smoothedZoomRef.current,
        duration: playback.isPlaying ? 650 : 900,
        essential: true,
        easing: easeOutQuart,
      });
      lastCameraUpdateRef.current = now;
    }
  }, [
    playback.flyoverCoordinates,
    playback.frame,
    playback.isPlaying,
    playback.progress,
  ]);

  if (playback.flyoverCoordinates.length < 2) {
    return (
      <div className={cn('flex h-64 items-center justify-center rounded-3xl bg-muted/20', className)}>
        <p className="text-sm text-muted-foreground">Pas assez de points pour lancer le survol 3D.</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative flex min-h-0 w-full min-w-0 flex-1 basis-0 flex-col overflow-hidden rounded-[28px] bg-muted/40',
        className,
      )}
    >
      <div
        ref={mapContainerRef}
        className="relative z-0 min-h-0 w-full min-w-0 flex-1 basis-0 bg-transparent"
      />
      {!sceneReady && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background/35">
          <div className="ios-card max-w-[min(100%,20rem)] border border-border/80 bg-card/95 px-5 py-4 text-center shadow-lg backdrop-blur-xl">
            <p className="text-[15px] font-medium text-foreground">Préparation du survol 3D</p>
            <p className="mt-1 text-[12px] text-muted-foreground">Chargement de la carte Mapbox Standard et du tracé…</p>
          </div>
        </div>
      )}
      {mapError && (
        <div className="absolute inset-x-4 top-4 z-20 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive backdrop-blur-xl">
          {mapError}
        </div>
      )}
      <RouteFlyoverHud
        routeName={routeName}
        isPlaying={playback.isPlaying}
        progress={playback.progress}
        currentDistance={playback.currentDistance}
        totalDistance={playback.totalDistance}
        elevationGain={playback.stats.elevationGain}
        speed={playback.speed}
        onPlayPause={playback.togglePlayback}
        onReset={playback.reset}
        onCycleSpeed={playback.cycleSpeed}
      />
    </div>
  );
}
