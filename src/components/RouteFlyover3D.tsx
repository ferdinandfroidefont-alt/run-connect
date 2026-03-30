import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { RouteFlyoverHud } from '@/components/RouteFlyoverHud';
import { useRouteFlyoverPlayback } from '@/hooks/useRouteFlyoverPlayback';
import { getMapboxAccessToken, MAPBOX_STYLE_BY_UI_ID } from '@/lib/mapboxConfig';
import type { MapCoord } from '@/lib/geoUtils';
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

const DEBUG_PREFIX = '[RouteFlyover3D]';
const DEBUG_MINIMAL_MAP = true;

export function RouteFlyover3D({
  coordinates,
  elevations,
  autoPlay = false,
  elevationExaggeration = 1.3,
  className,
  routeName,
  routeStats,
}: RouteFlyover3DProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [containerDebug, setContainerDebug] = useState<{ width: number; height: number } | null>(null);

  const playback = useRouteFlyoverPlayback({
    coordinates,
    elevations,
    routeStats,
    autoPlay,
  });

  const logDebug = (...args: unknown[]) => {
    console.log(DEBUG_PREFIX, ...args);
  };

  useEffect(() => {
    const container = mapContainerRef.current;
    logDebug('mount', {
      hasRef: !!container,
      points: playback.flyoverCoordinates.length,
      minimalMode: DEBUG_MINIMAL_MAP,
    });

    if (!container || playback.flyoverCoordinates.length < 2) {
      logDebug('abort init', {
        reason: !container ? 'missing-ref' : 'not-enough-points',
      });
      return;
    }

    const rect = container.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(container);
    const initialSize = {
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    };
    setContainerDebug(initialSize);
    logDebug('container metrics on mount', {
      ...initialSize,
      position: computedStyle.position,
      zIndex: computedStyle.zIndex,
      display: computedStyle.display,
      visibility: computedStyle.visibility,
      opacity: computedStyle.opacity,
    });

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const nextSize = {
        width: Math.round(entry.contentRect.width),
        height: Math.round(entry.contentRect.height),
      };
      setContainerDebug(nextSize);
      logDebug('container resized', nextSize);
      mapRef.current?.resize();
    });
    resizeObserver.observe(container);

    const token = getMapboxAccessToken();
    if (!token) {
      logDebug('token missing');
      setMapError('Token Mapbox manquant.');
      resizeObserver.disconnect();
      return;
    }
    logDebug('token ok');

    mapboxgl.accessToken = token;
    setSceneReady(false);
    setMapError(null);

    const fallbackCenter: MapCoord = { lat: 48.8566, lng: 2.3522 };
    const mapCenter = playback.flyoverCoordinates[0] ?? fallbackCenter;
    logDebug('before new map', {
      center: mapCenter,
      style: MAPBOX_STYLE_BY_UI_ID.roadmap,
      containerSize: initialSize,
    });

    const map = new mapboxgl.Map({
      container,
      style: MAPBOX_STYLE_BY_UI_ID.roadmap,
      center: [mapCenter.lng, mapCenter.lat],
      zoom: 12,
      pitch: 0,
      bearing: 0,
      interactive: true,
      attributionControl: false,
      antialias: false,
    });
    mapRef.current = map;
    logDebug('after new map');

    map.on('error', (event) => {
      const message =
        typeof event.error?.message === 'string' && event.error.message.trim()
          ? event.error.message
          : 'La carte Mapbox n’a pas pu se charger.';
      logDebug('map error', {
        message,
        event,
      });
      setMapError(message);
    });

    map.on('style.load', () => {
      logDebug('style.load');
    });

    map.on('load', () => {
      logDebug('load');
      map.resize();
      setSceneReady(true);
    });

    map.on('idle', () => {
      logDebug('idle');
      setSceneReady(true);
      map.resize();
    });

    window.requestAnimationFrame(() => map.resize());
    window.setTimeout(() => map.resize(), 100);
    window.setTimeout(() => map.resize(), 350);
    window.setTimeout(() => map.resize(), 900);

    return () => {
      logDebug('cleanup');
      resizeObserver.disconnect();
      setSceneReady(false);
      map.remove();
      mapRef.current = null;
    };
  }, [playback.flyoverCoordinates]);

  if (playback.flyoverCoordinates.length < 2) {
    return (
      <div className={cn('flex h-64 items-center justify-center rounded-3xl bg-muted/20', className)}>
        <p className="text-sm text-muted-foreground">Pas assez de points pour lancer le survol 3D.</p>
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden rounded-[28px] bg-black', className)} style={{ minHeight: 320 }}>
      <div ref={mapContainerRef} className="absolute inset-0 z-0" />
      {!sceneReady && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/18">
          <div className="rounded-3xl border border-white/10 bg-black/30 px-5 py-4 text-center text-white backdrop-blur-xl">
            <p className="text-[15px] font-medium">Debug carte minimale</p>
            <p className="mt-1 text-[12px] text-white/60">Initialisation Mapbox simple en cours…</p>
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute left-3 top-3 z-20 rounded-xl border border-white/10 bg-black/45 px-3 py-2 text-[11px] text-white/80 backdrop-blur-xl">
        <div>Map z-index: 0</div>
        <div>HUD z-index: 30</div>
        <div>
          Conteneur: {containerDebug ? `${containerDebug.width}x${containerDebug.height}` : 'inconnu'}
        </div>
      </div>
      {mapError && (
        <div className="absolute inset-x-4 top-4 z-20 rounded-2xl border border-red-400/25 bg-red-500/14 px-4 py-3 text-sm text-white backdrop-blur-xl">
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
