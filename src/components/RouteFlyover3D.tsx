import { useEffect, useMemo, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { RouteFlyoverHud } from '@/components/RouteFlyoverHud';
import { useRouteFlyoverPlayback } from '@/hooks/useRouteFlyoverPlayback';
import { getMapboxAccessToken, MAPBOX_STYLE_BY_UI_ID } from '@/lib/mapboxConfig';
import type { MapCoord } from '@/lib/geoUtils';
import {
  clamp,
  lineStringFeature,
  multiPointFeature,
  normalizeAngleDiff,
  pointFeature,
} from '@/lib/routeFlyover';
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

const DEM_SOURCE_ID = 'route-flyover-dem';
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
  elevationExaggeration = 1.3,
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
    // The initial pose only matters when the route changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [playback.flyoverCoordinates],
  );

  useEffect(() => {
    if (!mapContainerRef.current || playback.flyoverCoordinates.length < 2) return;
    const token = getMapboxAccessToken();
    if (!token) return;

    mapboxgl.accessToken = token;

    const startFrame = playback.frame;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: MAPBOX_STYLE_BY_UI_ID.satellite,
      center: [startFrame.focusCenter.lng, startFrame.focusCenter.lat],
      zoom: startFrame.zoom,
      pitch: startFrame.pitch,
      bearing: startFrame.bearing,
      interactive: false,
      attributionControl: false,
      antialias: true,
      pitchWithRotate: false,
    });

    mapRef.current = map;

    const bootScene = () => {
      if (!mapRef.current) return;

      if (!map.getSource(DEM_SOURCE_ID)) {
        map.addSource(DEM_SOURCE_ID, {
          type: 'raster-dem',
          url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
          tileSize: 512,
          maxzoom: 14,
        });
      }

      map.setTerrain({ source: DEM_SOURCE_ID, exaggeration: elevationExaggeration });
      map.setFog({
        range: [0.8, 8],
        color: 'rgb(198, 217, 240)',
        'high-color': 'rgb(36, 88, 168)',
        'space-color': 'rgb(8, 10, 20)',
        'horizon-blend': 0.08,
        'star-intensity': 0.12,
      });

      map.addSource(BASE_SOURCE_ID, {
        type: 'geojson',
        data: lineStringFeature(playback.flyoverCoordinates),
      });
      map.addSource(TRAVELED_SOURCE_ID, {
        type: 'geojson',
        data: lineStringFeature([playback.frame.currentPosition]),
      });
      map.addSource(POINT_SOURCE_ID, {
        type: 'geojson',
        data: pointFeature(playback.frame.currentPosition),
      });
      map.addSource(ENDPOINT_SOURCE_ID, {
        type: 'geojson',
        data: multiPointFeature(endpoints),
      });

      map.addLayer({
        id: `${BASE_SOURCE_ID}-shadow`,
        type: 'line',
        source: BASE_SOURCE_ID,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#ffffff',
          'line-width': 7,
          'line-opacity': 0.14,
        },
      });

      map.addLayer({
        id: `${BASE_SOURCE_ID}-line`,
        type: 'line',
        source: BASE_SOURCE_ID,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#7dd3fc',
          'line-width': 4.5,
          'line-opacity': 0.28,
        },
      });

      map.addLayer({
        id: `${TRAVELED_SOURCE_ID}-glow`,
        type: 'line',
        source: TRAVELED_SOURCE_ID,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#38bdf8',
          'line-width': 11,
          'line-opacity': 0.24,
          'line-blur': 1.1,
        },
      });

      map.addLayer({
        id: `${TRAVELED_SOURCE_ID}-line`,
        type: 'line',
        source: TRAVELED_SOURCE_ID,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#f97316',
          'line-width': 5.5,
          'line-opacity': 0.98,
        },
      });

      map.addLayer({
        id: `${ENDPOINT_SOURCE_ID}-halo`,
        type: 'circle',
        source: ENDPOINT_SOURCE_ID,
        paint: {
          'circle-radius': 10,
          'circle-color': '#ffffff',
          'circle-opacity': 0.22,
        },
      });

      map.addLayer({
        id: `${ENDPOINT_SOURCE_ID}-dot`,
        type: 'circle',
        source: ENDPOINT_SOURCE_ID,
        paint: {
          'circle-radius': 5.5,
          'circle-color': '#ffffff',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
          'circle-opacity': 0.9,
        },
      });

      map.addLayer({
        id: `${POINT_SOURCE_ID}-halo`,
        type: 'circle',
        source: POINT_SOURCE_ID,
        paint: {
          'circle-radius': 18,
          'circle-color': '#38bdf8',
          'circle-opacity': 0.24,
          'circle-blur': 0.75,
        },
      });

      map.addLayer({
        id: `${POINT_SOURCE_ID}-dot`,
        type: 'circle',
        source: POINT_SOURCE_ID,
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

      map.easeTo({
        center: [initialFrame.focusCenter.lng, initialFrame.focusCenter.lat],
        bearing: initialFrame.bearing,
        pitch: initialFrame.pitch,
        zoom: initialFrame.zoom,
        duration: 1200,
        essential: true,
        easing: easeOutQuart,
      });
    };

    if (map.isStyleLoaded()) {
      bootScene();
    } else {
      map.once('load', bootScene);
    }

    return () => {
      mapReadyRef.current = false;
      lastCameraUpdateRef.current = 0;
      smoothedCenterRef.current = null;
      smoothedBearingRef.current = null;
      smoothedPitchRef.current = null;
      smoothedZoomRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [elevationExaggeration, endpoints, initialFrame, playback.flyoverCoordinates]);

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
    <div className={cn('relative overflow-hidden rounded-[28px] bg-black', className)} style={{ minHeight: 320 }}>
      <div ref={mapContainerRef} className="absolute inset-0" />
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
