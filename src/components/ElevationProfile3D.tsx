import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, Mountain, MapPin, TrendingUp, Gauge } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import { getMapboxAccessToken } from '@/lib/mapboxConfig';
import { bearingDegrees, destinationPointMeters } from '@/lib/geoUtils';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ElevationProfile3DProps {
  coordinates: { lat: number; lng: number }[];
  elevations: number[];
  activityType?: string;
  autoPlay?: boolean;
  elevationExaggeration?: number;
  className?: string;
  routeName?: string;
  routeStats?: {
    totalDistance: number;
    elevationGain: number;
    elevationLoss: number;
  } | null;
}

// Haversine distance in meters
function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Position interpolée le long du polyline (distance cumulée en mètres). */
function positionAlongRouteAtDistance(
  coordinates: { lat: number; lng: number }[],
  cumulativeDistances: number[],
  distanceM: number
): { pos: { lat: number; lng: number }; segIndex: number; segT: number } {
  const n = coordinates.length;
  if (n < 2) {
    return { pos: { lat: coordinates[0].lat, lng: coordinates[0].lng }, segIndex: 0, segT: 0 };
  }
  const totalD = cumulativeDistances[n - 1] || 0;
  const d = Math.max(0, Math.min(distanceM, totalD));
  if (d <= 0) {
    return { pos: { lat: coordinates[0].lat, lng: coordinates[0].lng }, segIndex: 0, segT: 0 };
  }
  if (d >= totalD) {
    return {
      pos: { lat: coordinates[n - 1].lat, lng: coordinates[n - 1].lng },
      segIndex: n - 2,
      segT: 1,
    };
  }
  let j = 0;
  while (j < n - 1 && cumulativeDistances[j + 1] < d) j++;
  const d0 = cumulativeDistances[j];
  const d1 = cumulativeDistances[j + 1];
  const segT = d1 > d0 ? (d - d0) / (d1 - d0) : 0;
  return {
    pos: {
      lat: coordinates[j].lat + (coordinates[j + 1].lat - coordinates[j].lat) * segT,
      lng: coordinates[j].lng + (coordinates[j + 1].lng - coordinates[j].lng) * segT,
    },
    segIndex: j,
    segT,
  };
}

/** Distance de visée vers l’avant pour stabiliser le cap. */
function lookAheadMeters(polylineLengthM: number): number {
  if (polylineLengthM <= 0) return 180;
  return Math.min(320, Math.max(140, polylineLengthM * 0.045));
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lineStringFeature(coords: { lat: number; lng: number }[]): GeoJSON.Feature<GeoJSON.LineString> {
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'LineString', coordinates: coords.map((c) => [c.lng, c.lat]) },
  };
}

const ELEV_SAT_STYLE = 'mapbox://styles/mapbox/satellite-streets-v12';
const SRC_REMAIN = 'elev3d-remain';
const SRC_GLOW = 'elev3d-glow';
const SRC_TRAV = 'elev3d-traveled';

/** Pitch de base (45–60°) selon le palier perf — vue vraiment inclinée, pas top-down. */
function baseTiltForTier(tier: 'high' | 'balanced' | 'battery'): number {
  if (tier === 'battery') return 48;
  if (tier === 'balanced') return 52;
  return 56;
}

type ChaseFrame = {
  center: { lat: number; lng: number };
  heading: number;
  tilt: number;
  zoom: number;
  currentPos: { lat: number; lng: number };
};

/** Pose caméra « survol » : centre décalé vers l’avant sur la polyline, cap = direction du mouvement. */
function computeChaseFrame(
  flyoverCoordinates: { lat: number; lng: number }[],
  cumulativeDistances: number[],
  distM: number,
  polylineLengthM: number,
  computeHeading: (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => number,
  performanceTier: 'high' | 'balanced' | 'battery',
  speedKmh: number
): ChaseFrame {
  const totalLen = polylineLengthM || cumulativeDistances[cumulativeDistances.length - 1] || 0;
  const d = Math.max(0, Math.min(distM, totalLen));
  const aheadM = lookAheadMeters(totalLen);
  const { pos: currentPos } = positionAlongRouteAtDistance(flyoverCoordinates, cumulativeDistances, d);
  const lookFarD = Math.min(d + aheadM, totalLen);
  const lookNearD = Math.min(d + aheadM * 0.35, totalLen);
  const { pos: lookFar } = positionAlongRouteAtDistance(flyoverCoordinates, cumulativeDistances, lookFarD);
  const { pos: lookNear } = positionAlongRouteAtDistance(flyoverCoordinates, cumulativeDistances, lookNearD);
  const heading = computeHeading(lookNear, lookFar);

  // Centre caméra : entre le point courant et une cible vers l’avant (effet « on survole le tracé »).
  const centerAheadD = Math.min(d + aheadM * 0.52, totalLen);
  const { pos: centerAhead } = positionAlongRouteAtDistance(flyoverCoordinates, cumulativeDistances, centerAheadD);
  const center = {
    lat: currentPos.lat * 0.38 + centerAhead.lat * 0.62,
    lng: currentPos.lng * 0.38 + centerAhead.lng * 0.62,
  };

  const tiltBase = baseTiltForTier(performanceTier);
  const tilt = clamp(tiltBase + Math.min(4, speedKmh / 55) * 2, 45, 60);

  const zoomBase =
    totalLen > 22000 ? 15.5 : totalLen > 12000 ? 16.25 : totalLen > 5000 ? 16.85 : 17.15;
  const zoomBoost = clamp(speedKmh / 42, 0, 1) * 0.35;
  const zoom = clamp(zoomBase + zoomBoost, 14.25, 18.4);

  return { center, heading, tilt, zoom, currentPos };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeAngleDiff(diff: number): number {
  let out = diff;
  while (out > 180) out -= 360;
  while (out < -180) out += 360;
  return out;
}

/** Lissage Catmull-Rom + limite de points pour conserver de bonnes perfs mobile. */
function buildFlyoverPath(
  coordinates: { lat: number; lng: number }[],
  maxPoints = 900
): { lat: number; lng: number }[] {
  if (coordinates.length <= 3) return coordinates;

  const rawSegments = coordinates.length - 1;
  const subdivisions = rawSegments > 250 ? 1 : rawSegments > 120 ? 2 : 3;
  const out: { lat: number; lng: number }[] = [];

  for (let i = 0; i < coordinates.length - 1; i++) {
    const p0 = coordinates[Math.max(0, i - 1)];
    const p1 = coordinates[i];
    const p2 = coordinates[i + 1];
    const p3 = coordinates[Math.min(coordinates.length - 1, i + 2)];

    if (i === 0) out.push({ lat: p1.lat, lng: p1.lng });

    for (let s = 1; s <= subdivisions; s++) {
      const t = s / subdivisions;
      const t2 = t * t;
      const t3 = t2 * t;
      // Catmull-Rom spline (centripetal-like coefficient simplification)
      const lat =
        0.5 *
        ((2 * p1.lat) +
          (-p0.lat + p2.lat) * t +
          (2 * p0.lat - 5 * p1.lat + 4 * p2.lat - p3.lat) * t2 +
          (-p0.lat + 3 * p1.lat - 3 * p2.lat + p3.lat) * t3);
      const lng =
        0.5 *
        ((2 * p1.lng) +
          (-p0.lng + p2.lng) * t +
          (2 * p0.lng - 5 * p1.lng + 4 * p2.lng - p3.lng) * t2 +
          (-p0.lng + 3 * p1.lng - 3 * p2.lng + p3.lng) * t3);
      out.push({ lat, lng });
    }
  }

  if (out.length <= maxPoints) return out;

  // Décimation uniforme pour éviter de trop charger l'animation.
  const step = out.length / (maxPoints - 1);
  const decimated: { lat: number; lng: number }[] = [];
  for (let i = 0; i < maxPoints - 1; i++) {
    decimated.push(out[Math.floor(i * step)]);
  }
  decimated.push(out[out.length - 1]);
  return decimated;
}

function remapElevationsToPathLength(elevations: number[], targetLength: number): number[] {
  if (targetLength <= 0) return [];
  if (elevations.length === 0) return Array.from({ length: targetLength }, () => 0);
  if (elevations.length === targetLength) return elevations;
  if (elevations.length === 1) return Array.from({ length: targetLength }, () => elevations[0]);

  const out = new Array<number>(targetLength);
  const lastSrc = elevations.length - 1;
  const lastDst = targetLength - 1;
  for (let i = 0; i < targetLength; i++) {
    const srcPos = (i / lastDst) * lastSrc;
    const a = Math.floor(srcPos);
    const b = Math.min(lastSrc, a + 1);
    const t = srcPos - a;
    out[i] = elevations[a] + (elevations[b] - elevations[a]) * t;
  }
  return out;
}

export const ElevationProfile3D: React.FC<ElevationProfile3DProps> = ({
  coordinates,
  elevations,
  autoPlay = false,
  className = '',
  routeName,
  routeStats,
}) => {
  const [performanceTier, setPerformanceTier] = useState<'high' | 'balanced' | 'battery'>(() => {
    if (typeof window === 'undefined') return 'balanced';
    const nav = window.navigator as Navigator & { deviceMemory?: number };
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return 'battery';
    const memory = nav.deviceMemory ?? 4;
    const cores = nav.hardwareConcurrency ?? 4;
    if (memory <= 3 || cores <= 4) return 'battery';
    if (memory <= 4 || cores <= 6) return 'balanced';
    return 'high';
  });
  const lowFpsStreakRef = useRef(0);

  const maxPathPoints = useMemo(() => {
    if (performanceTier === 'battery') return 520;
    if (performanceTier === 'balanced') return 760;
    return 980;
  }, [performanceTier]);

  const flyoverCoordinates = useMemo(
    () => buildFlyoverPath(coordinates, maxPathPoints),
    [coordinates, maxPathPoints]
  );
  const flyoverElevations = useMemo(
    () => remapElevationsToPathLength(elevations, flyoverCoordinates.length),
    [elevations, flyoverCoordinates.length]
  );

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const staticEndpointMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const animationRef = useRef<number | null>(null);
  /** Centre caméra lissé le long du trajet */
  const cameraCenterLatRef = useRef<number | null>(null);
  const cameraCenterLngRef = useRef<number | null>(null);
  /** État lissé cap / tilt / zoom — persiste entre play / pause */
  const headingSmoothRef = useRef<number | null>(null);
  const tiltSmoothRef = useRef<number | null>(null);
  const zoomSmoothRef = useRef<number | null>(null);
  /** Vitesse instantanée (lissée) pour HUD */
  const speedKmhSmoothRef = useRef(0);
  const lastSpeedSampleRef = useRef<{ pos: { lat: number; lng: number }; time: number } | null>(null);

  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [progress, setProgress] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  const [currentElevation, setCurrentElevation] = useState(0);
  const [currentSlope, setCurrentSlope] = useState(0);
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState(0);
  const [speed, setSpeed] = useState<1 | 2>(1);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdownNum, setCountdownNum] = useState(3);

  const progressRef = useRef(progress);
  progressRef.current = progress;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const countdownTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pre-compute cumulative distances
  const cumulativeDistances = useMemo(() => {
    const dists = [0];
    for (let i = 1; i < flyoverCoordinates.length; i++) {
      dists.push(dists[i - 1] + haversine(flyoverCoordinates[i - 1], flyoverCoordinates[i]));
    }
    return dists;
  }, [flyoverCoordinates]);

  const totalRouteDistance = useMemo(() => {
    if (routeStats?.totalDistance) return routeStats.totalDistance;
    return cumulativeDistances[cumulativeDistances.length - 1] || 0;
  }, [cumulativeDistances, routeStats]);

  // Pre-compute slopes (%)
  const slopes = useMemo(() => {
    const result: number[] = [0];
    for (let i = 1; i < flyoverCoordinates.length; i++) {
      const dElev = (flyoverElevations[i] || 0) - (flyoverElevations[i - 1] || 0);
      const dHoriz = haversine(flyoverCoordinates[i - 1], flyoverCoordinates[i]);
      result.push(dHoriz > 1 ? (dElev / dHoriz) * 100 : 0);
    }
    return result;
  }, [flyoverCoordinates, flyoverElevations]);

  // Elevation stats
  const elevStats = useMemo(() => {
    if (routeStats) return routeStats;
    let gain = 0, loss = 0;
    for (let i = 1; i < flyoverElevations.length; i++) {
      const diff = flyoverElevations[i] - flyoverElevations[i - 1];
      if (diff > 0) gain += diff; else loss += Math.abs(diff);
    }
    return { totalDistance: totalRouteDistance, elevationGain: Math.round(gain), elevationLoss: Math.round(loss) };
  }, [flyoverElevations, routeStats, totalRouteDistance]);

  // Initialize Mapbox (satellite + pitch / bearing pour le flyover)
  useEffect(() => {
    if (!mapContainerRef.current || flyoverCoordinates.length < 2) return;
    const token = getMapboxAccessToken();
    if (!token) return;

    let cancelled = false;
    mapboxgl.accessToken = token;

    const centerLat = flyoverCoordinates.reduce((s, c) => s + c.lat, 0) / flyoverCoordinates.length;
    const centerLng = flyoverCoordinates.reduce((s, c) => s + c.lng, 0) / flyoverCoordinates.length;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: ELEV_SAT_STYLE,
      center: [centerLng, centerLat],
      zoom: 16,
      pitch: 52,
      bearing: 0,
      interactive: true,
      attributionControl: false,
    });
    mapRef.current = map;

    const computeH = (from: { lat: number; lng: number }, to: { lat: number; lng: number }) =>
      bearingDegrees(from, to);

    const boot = () => {
      if (cancelled) return;
      const totalIdxInit = flyoverCoordinates.length - 1;
      const polyLenInit = cumulativeDistances[totalIdxInit] || 0;
      const frame0 = computeChaseFrame(
        flyoverCoordinates,
        cumulativeDistances,
        0,
        polyLenInit,
        computeH,
        performanceTier,
        0,
      );
      map.jumpTo({
        center: [frame0.center.lng, frame0.center.lat],
        bearing: frame0.heading,
        pitch: frame0.tilt,
        zoom: frame0.zoom,
      });
      headingSmoothRef.current = frame0.heading;
      tiltSmoothRef.current = frame0.tilt;
      zoomSmoothRef.current = frame0.zoom;
      cameraCenterLatRef.current = frame0.center.lat;
      cameraCenterLngRef.current = frame0.center.lng;

      const fullPath = flyoverCoordinates.map((c) => ({ lat: c.lat, lng: c.lng }));
      map.addSource(SRC_REMAIN, { type: 'geojson', data: lineStringFeature(fullPath) });
      map.addLayer({
        id: `${SRC_REMAIN}-layer`,
        type: 'line',
        source: SRC_REMAIN,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#FF5A1F', 'line-opacity': 0.38, 'line-width': 6 },
      });

      map.addSource(SRC_GLOW, { type: 'geojson', data: lineStringFeature([]) });
      map.addLayer({
        id: `${SRC_GLOW}-layer`,
        type: 'line',
        source: SRC_GLOW,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#34d399', 'line-opacity': 0.35, 'line-width': 14 },
      });

      map.addSource(SRC_TRAV, { type: 'geojson', data: lineStringFeature([]) });
      map.addLayer({
        id: `${SRC_TRAV}-layer`,
        type: 'line',
        source: SRC_TRAV,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#ffffff', 'line-opacity': 1, 'line-width': 5 },
      });

      const mkEndDot = (fill: string) => {
        const el = document.createElement('div');
        el.style.width = '16px';
        el.style.height = '16px';
        el.style.borderRadius = '50%';
        el.style.background = fill;
        el.style.border = '3px solid white';
        el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.35)';
        return el;
      };
      staticEndpointMarkersRef.current = [
        new mapboxgl.Marker({ element: mkEndDot('#22c55e') })
          .setLngLat([flyoverCoordinates[0]!.lng, flyoverCoordinates[0]!.lat])
          .addTo(map),
        new mapboxgl.Marker({ element: mkEndDot('#ef4444') })
          .setLngLat([
            flyoverCoordinates[flyoverCoordinates.length - 1]!.lng,
            flyoverCoordinates[flyoverCoordinates.length - 1]!.lat,
          ])
          .addTo(map),
      ];

      const progEl = document.createElement('div');
      progEl.style.width = '12px';
      progEl.style.height = '12px';
      progEl.style.borderRadius = '50%';
      progEl.style.background = '#ffffff';
      progEl.style.border = '2px solid #2563eb';
      progEl.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';
      markerRef.current = new mapboxgl.Marker({ element: progEl })
        .setLngLat([flyoverCoordinates[0]!.lng, flyoverCoordinates[0]!.lat])
        .addTo(map);

      setMapReady(true);
    };

    if (map.isStyleLoaded()) boot();
    else map.once('load', boot);

    return () => {
      cancelled = true;
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      staticEndpointMarkersRef.current.forEach((m) => m.remove());
      staticEndpointMarkersRef.current = [];
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [flyoverCoordinates, cumulativeDistances, performanceTier]);

  const computeHeading = useCallback(
    (from: { lat: number; lng: number }, to: { lat: number; lng: number }) => bearingDegrees(from, to),
    [],
  );

  // Boucle d’animation : requestAnimationFrame uniquement pendant la lecture — caméra déplacée le long du GPS
  useEffect(() => {
    if (!mapReady || !mapRef.current || flyoverCoordinates.length < 2 || !isPlaying) {
      return undefined;
    }

    let lastTime = 0;
    const totalIdx = flyoverCoordinates.length - 1;
    const polylineLengthM = cumulativeDistances[totalIdx] || 0;
    const targetDurationS = clamp(polylineLengthM / 78, 36, 170);
    const baseMps = polylineLengthM > 0 ? polylineLengthM / targetDurationS : 0;

    const animate = (timestamp: number) => {
      if (!isPlayingRef.current) return;

      if (!lastTime) lastTime = timestamp;
      const rawDelta = (timestamp - lastTime) / 1000;
      const delta = Math.min(0.05, rawDelta);
      lastTime = timestamp;

      if (rawDelta > 0.04) {
        lowFpsStreakRef.current += 1;
      } else {
        lowFpsStreakRef.current = Math.max(0, lowFpsStreakRef.current - 1);
      }
      if (lowFpsStreakRef.current > 45) {
        setPerformanceTier((tier) => (tier === 'high' ? 'balanced' : tier === 'balanced' ? 'battery' : tier));
        lowFpsStreakRef.current = 0;
      }

      const speedMultiplier = speedRef.current;
      const dynamicMps = baseMps * speedMultiplier;
      let newProgress = progressRef.current + (polylineLengthM > 0 ? (delta * dynamicMps) / polylineLengthM : 0);

      if (newProgress >= 1) {
        newProgress = 1;
        setIsPlaying(false);
      }

      setProgress(newProgress);
      progressRef.current = newProgress;

      const distNow = newProgress * polylineLengthM;
      const { pos: currentPos, segIndex: idx, segT: frac } = positionAlongRouteAtDistance(
        flyoverCoordinates,
        cumulativeDistances,
        distNow
      );

      const sample = lastSpeedSampleRef.current;
      if (sample && delta > 1e-4) {
        const movedM = haversine(sample.pos, currentPos);
        const kmh = (movedM / delta) * 3.6;
        speedKmhSmoothRef.current = speedKmhSmoothRef.current * 0.82 + kmh * 0.18;
        setCurrentSpeedKmh(Math.round(speedKmhSmoothRef.current));
      }
      lastSpeedSampleRef.current = { pos: { ...currentPos }, time: timestamp };

      markerRef.current?.setLngLat([currentPos.lng, currentPos.lat]);

      const trailPath = flyoverCoordinates.slice(0, idx + 1).map((c) => ({ lat: c.lat, lng: c.lng }));
      trailPath.push(currentPos);
      const mapAnim = mapRef.current;
      if (mapAnim?.getSource(SRC_TRAV)) {
        (mapAnim.getSource(SRC_TRAV) as mapboxgl.GeoJSONSource).setData(lineStringFeature(trailPath));
      }
      if (mapAnim?.getSource(SRC_GLOW)) {
        (mapAnim.getSource(SRC_GLOW) as mapboxgl.GeoJSONSource).setData(lineStringFeature(trailPath));
      }

      const remainingPath: { lat: number; lng: number }[] = [{ ...currentPos }];
      for (let k = idx + 1; k <= totalIdx; k++) {
        remainingPath.push({ lat: flyoverCoordinates[k].lat, lng: flyoverCoordinates[k].lng });
      }
      if (mapAnim?.getSource(SRC_REMAIN)) {
        (mapAnim.getSource(SRC_REMAIN) as mapboxgl.GeoJSONSource).setData(lineStringFeature(remainingPath));
      }

      if (flyoverElevations.length > idx + 1) {
        const elev = flyoverElevations[idx] + (flyoverElevations[idx + 1] - flyoverElevations[idx]) * frac;
        setCurrentElevation(Math.round(elev));
      }

      const slopeVal = slopes[idx] || 0;
      const smoothSlope = slopeVal + ((slopes[Math.min(idx + 1, totalIdx)] || 0) - slopeVal) * frac;
      setCurrentSlope(Math.round(smoothSlope * 10) / 10);

      const speedKmh = speedKmhSmoothRef.current;
      const frameIdeal = computeChaseFrame(
        flyoverCoordinates,
        cumulativeDistances,
        distNow,
        polylineLengthM,
        computeHeading,
        performanceTier,
        speedKmh
      );

      const targetHeading = frameIdeal.heading;
      let headingSmooth = headingSmoothRef.current ?? targetHeading;
      let diff = normalizeAngleDiff(targetHeading - headingSmooth);
      const headingLerp = performanceTier === 'battery' ? 0.07 : performanceTier === 'balanced' ? 0.09 : 0.11;
      const easedTurn = easeInOutCubic(clamp(Math.abs(diff) / 42, 0, 1));
      headingSmooth += diff * headingLerp * (0.55 + 0.45 * easedTurn);
      headingSmoothRef.current = headingSmooth;

      const turnIntensity = Math.abs(diff);
      let tiltSmooth = tiltSmoothRef.current ?? frameIdeal.tilt;
      const tiltTarget = clamp(
        frameIdeal.tilt - Math.min(5, turnIntensity * 0.08) + Math.max(-3, Math.min(3, smoothSlope * 0.12)),
        45,
        60
      );
      tiltSmooth += (tiltTarget - tiltSmooth) * (performanceTier === 'battery' ? 0.06 : 0.085);
      tiltSmoothRef.current = tiltSmooth;

      let zoomSmooth = zoomSmoothRef.current ?? frameIdeal.zoom;
      const zoomTarget = frameIdeal.zoom - Math.min(0.45, turnIntensity * 0.018) + clamp(speedKmh / 120, 0, 0.15);
      zoomSmooth += (zoomTarget - zoomSmooth) * (performanceTier === 'battery' ? 0.05 : 0.07);
      zoomSmoothRef.current = zoomSmooth;

      const map = mapRef.current;
      if (!map) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      let targetCam = frameIdeal.center;
      const maxCamShiftM = Math.min(85, 18 + turnIntensity * 1.1);
      const ortho = headingSmooth + 90;
      const wA = easeInOutCubic(clamp(turnIntensity / 28, 0, 1));
      const shift = (diff >= 0 ? 1 : -1) * maxCamShiftM * wA * 0.55;
      const shifted = destinationPointMeters({ lat: targetCam.lat, lng: targetCam.lng }, ortho, shift);
      targetCam = { lat: shifted.lat, lng: shifted.lng };

      const camLerp = performanceTier === 'battery' ? 0.14 : performanceTier === 'balanced' ? 0.19 : 0.22;
      if (cameraCenterLatRef.current === null || cameraCenterLngRef.current === null) {
        cameraCenterLatRef.current = targetCam.lat;
        cameraCenterLngRef.current = targetCam.lng;
      } else {
        cameraCenterLatRef.current += (targetCam.lat - cameraCenterLatRef.current) * camLerp;
        cameraCenterLngRef.current += (targetCam.lng - cameraCenterLngRef.current) * camLerp;
      }

      map.jumpTo({
        center: [cameraCenterLngRef.current!, cameraCenterLatRef.current!],
        bearing: headingSmooth,
        pitch: tiltSmooth,
        zoom: zoomSmooth,
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [
    isPlaying,
    mapReady,
    flyoverCoordinates,
    flyoverElevations,
    slopes,
    computeHeading,
    cumulativeDistances,
    performanceTier,
  ]);

  const handlePlayPause = useCallback(() => {
    if (!isPlaying && progress === 0) {
      if (countdownTimeoutRef.current) {
        clearTimeout(countdownTimeoutRef.current);
        countdownTimeoutRef.current = null;
      }
      setCountdownNum(3);
      setShowCountdown(true);
      const tick = (remaining: number) => {
        if (remaining > 0) {
          setCountdownNum(remaining);
          countdownTimeoutRef.current = window.setTimeout(() => tick(remaining - 1), 600);
        } else {
          countdownTimeoutRef.current = null;
          setShowCountdown(false);
          setIsPlaying(true);
        }
      };
      countdownTimeoutRef.current = window.setTimeout(() => tick(2), 600);
    } else {
      setIsPlaying((p) => !p);
    }
  }, [isPlaying, progress]);

  const handleRecenter = useCallback(() => {
    setIsPlaying(false);
    setProgress(0);
    progressRef.current = 0;
    cameraCenterLatRef.current = null;
    cameraCenterLngRef.current = null;
    headingSmoothRef.current = null;
    tiltSmoothRef.current = null;
    zoomSmoothRef.current = null;
    lastSpeedSampleRef.current = null;
    speedKmhSmoothRef.current = 0;
    setCurrentSpeedKmh(0);
    if (!mapRef.current || flyoverCoordinates.length < 2) return;
    const map = mapRef.current;
    const empty: { lat: number; lng: number }[] = [];
    if (map.getSource(SRC_TRAV)) {
      (map.getSource(SRC_TRAV) as mapboxgl.GeoJSONSource).setData(lineStringFeature(empty));
    }
    if (map.getSource(SRC_GLOW)) {
      (map.getSource(SRC_GLOW) as mapboxgl.GeoJSONSource).setData(lineStringFeature(empty));
    }
    if (map.getSource(SRC_REMAIN)) {
      (map.getSource(SRC_REMAIN) as mapboxgl.GeoJSONSource).setData(
        lineStringFeature(flyoverCoordinates.map((c) => ({ lat: c.lat, lng: c.lng }))),
      );
    }
    markerRef.current?.setLngLat([flyoverCoordinates[0]!.lng, flyoverCoordinates[0]!.lat]);

    const totalIdx = flyoverCoordinates.length - 1;
    const polyLen = cumulativeDistances[totalIdx] || 0;
    const frame0 = computeChaseFrame(
      flyoverCoordinates,
      cumulativeDistances,
      0,
      polyLen,
      computeHeading,
      performanceTier,
      0
    );
    headingSmoothRef.current = frame0.heading;
    tiltSmoothRef.current = frame0.tilt;
    zoomSmoothRef.current = frame0.zoom;
    cameraCenterLatRef.current = frame0.center.lat;
    cameraCenterLngRef.current = frame0.center.lng;
    map.jumpTo({
      center: [frame0.center.lng, frame0.center.lat],
      bearing: frame0.heading,
      pitch: frame0.tilt,
      zoom: frame0.zoom,
    });
  }, [flyoverCoordinates, cumulativeDistances, computeHeading, performanceTier]);

  useEffect(() => {
    return () => {
      if (countdownTimeoutRef.current) {
        clearTimeout(countdownTimeoutRef.current);
        countdownTimeoutRef.current = null;
      }
    };
  }, []);

  const cycleSpeed = useCallback(() => {
    setSpeed((s) => (s === 1 ? 2 : 1));
  }, []);

  const currentKm = (progress * totalRouteDistance / 1000).toFixed(2);

  // Elevation mini-profile data
  const elevationProfile = useMemo(() => {
    if (flyoverElevations.length < 2) return [];
    const samples = 80;
    const step = Math.max(1, Math.floor(flyoverElevations.length / samples));
    const points: number[] = [];
    const min = Math.min(...flyoverElevations);
    const max = Math.max(...flyoverElevations);
    const range = max - min || 1;
    for (let i = 0; i < flyoverElevations.length; i += step) {
      points.push((flyoverElevations[i] - min) / range);
    }
    return points;
  }, [flyoverElevations]);

  if (flyoverCoordinates.length < 2) {
    return (
      <div className={`flex items-center justify-center h-64 bg-muted/20 rounded-lg ${className}`}>
        <p className="text-sm text-muted-foreground">Pas assez de points pour la vue 3D</p>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden bg-black", className)} style={{ minHeight: 300 }}>
      <div ref={mapContainerRef} className="w-full h-full absolute inset-0" />

      {/* Countdown overlay with numbers */}
      <AnimatePresence>
        {showCountdown && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={countdownNum}
                initial={{ scale: 2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="h-24 w-24 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/40"
              >
                <span className="text-[40px] font-bold text-primary-foreground">{countdownNum}</span>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top gradient */}
      <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-black/60 to-transparent z-10 pointer-events-none" />

      {/* HUD Stats Bar — discret en lecture pour laisser la place au survol */}
      <div className="absolute top-0 left-0 right-0 z-20 pt-[env(safe-area-inset-top)] pointer-events-none">
        <div
          className={cn(
            'mx-3 mt-2 rounded-2xl border px-2 py-2.5 sm:px-4 sm:py-3 transition-all duration-500',
            isPlaying
              ? 'bg-black/35 backdrop-blur-md border-white/8'
              : 'bg-black/50 backdrop-blur-xl border-white/10'
          )}
        >
          <div className="flex items-center justify-center gap-1.5 mb-1.5">
            {routeName && (
              <p className="text-[10px] sm:text-[11px] text-white/45 text-center truncate max-w-[85%]">{routeName}</p>
            )}
            <span className="text-[9px] uppercase tracking-wide text-white/45 rounded-full border border-white/15 px-1.5 py-0.5">
              {performanceTier === 'high' ? 'ultra' : performanceTier === 'balanced' ? 'équilibré' : 'éco'}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1 sm:gap-2 items-stretch">
            <div className="text-center min-w-0">
              <div className="flex items-center justify-center gap-0.5 mb-0.5">
                <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0 text-primary" />
                <p className="text-[18px] sm:text-[22px] font-bold text-white leading-tight tabular-nums truncate">
                  {currentKm}
                </p>
              </div>
              <p className="text-[9px] sm:text-[10px] text-white/45 uppercase tracking-wider font-medium">km</p>
            </div>

            <div className="text-center min-w-0 border-l border-white/10">
              <div className="flex items-center justify-center gap-0.5 mb-0.5">
                <Gauge className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0 text-sky-400" />
                <p className="text-[18px] sm:text-[22px] font-bold text-white leading-tight tabular-nums">
                  {!isPlaying && progress === 0 ? '—' : currentSpeedKmh}
                </p>
              </div>
              <p className="text-[9px] sm:text-[10px] text-white/45 uppercase tracking-wider font-medium">km/h</p>
            </div>

            <div className="text-center min-w-0 border-l border-white/10">
              <div className="flex items-center justify-center gap-0.5 mb-0.5">
                <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0 text-emerald-400" />
                <p className="text-[18px] sm:text-[22px] font-bold text-white leading-tight tabular-nums">
                  {currentSlope > 0 ? '+' : ''}
                  {currentSlope.toFixed(1)}
                </p>
              </div>
              <p className="text-[9px] sm:text-[10px] text-white/45 uppercase tracking-wider font-medium">pente %</p>
            </div>

            <div className="text-center min-w-0 border-l border-white/10">
              <div className="flex items-center justify-center gap-0.5 mb-0.5">
                <Mountain className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0 text-amber-400" />
                <p className="text-[18px] sm:text-[22px] font-bold text-white leading-tight tabular-nums">{currentElevation}</p>
              </div>
              <p className="text-[9px] sm:text-[10px] text-white/45 uppercase tracking-wider font-medium">m</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom controls area */}
      <div className="absolute bottom-0 left-0 right-0 z-20 pb-[env(safe-area-inset-bottom)]">
        {/* Bottom gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

        {/* Elevation mini-profile with cursor */}
        {elevationProfile.length > 0 && (
          <div className="relative h-16 mx-4 mb-2">
            {/* Gain/loss labels */}
            <div className="absolute top-0 right-0 flex gap-2 z-10">
              <span className="text-[10px] font-semibold text-emerald-400">↑{elevStats.elevationGain}m</span>
              <span className="text-[10px] font-semibold text-red-400">↓{elevStats.elevationLoss}m</span>
            </div>

            {/* Bars */}
            <div className="flex items-end gap-px h-full pt-4 opacity-50">
              {elevationProfile.map((h, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex-1 rounded-t-sm transition-colors duration-150",
                    (i / elevationProfile.length) < progress ? "bg-emerald-400" : "bg-white/25"
                  )}
                  style={{ height: `${Math.max(6, h * 100)}%` }}
                />
              ))}
            </div>

            {/* Cursor line */}
            <div
              className="absolute top-3 bottom-0 w-0.5 bg-white rounded-full z-10 transition-[left] duration-100"
              style={{ left: `${progress * 100}%` }}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-white border-2 border-primary shadow-lg" />
            </div>
          </div>
        )}

        {/* Progress bar */}
        <div className="mx-4 h-1 bg-white/20 rounded-full overflow-hidden mb-3 relative z-10">
          <motion.div
            className="h-full bg-primary rounded-full"
            style={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>

        {/* Control buttons */}
        <div className="flex items-center justify-center gap-4 px-4 pb-3 relative z-10">
          {/* Reset */}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRecenter}
            className="h-11 w-11 rounded-full bg-white/10 backdrop-blur-xl border border-white/15 hover:bg-white/20 p-0"
          >
            <RotateCcw className="h-4 w-4 text-white" />
          </Button>

          {/* Play/Pause — 60px */}
          <Button
            size="sm"
            variant="ghost"
            onClick={handlePlayPause}
            className="h-[60px] w-[60px] rounded-full bg-primary hover:bg-primary/90 p-0 shadow-lg shadow-primary/30"
          >
            {isPlaying
              ? <Pause className="h-6 w-6 text-primary-foreground" />
              : <Play className="h-6 w-6 text-primary-foreground ml-0.5" />
            }
          </Button>

          {/* Speed with label */}
          <div className="flex flex-col items-center gap-0.5">
            <Button
              size="sm"
              variant="ghost"
              onClick={cycleSpeed}
              className="h-11 w-11 rounded-full bg-white/10 backdrop-blur-xl border border-white/15 hover:bg-white/20 p-0"
            >
              <span className="text-[12px] font-bold text-white">{speed}x</span>
            </Button>
            <span className="text-[9px] text-white/40 font-medium">vitesse</span>
          </div>
        </div>
      </div>
    </div>
  );
};
