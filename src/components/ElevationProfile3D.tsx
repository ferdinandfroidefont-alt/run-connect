import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, Mountain, MapPin, TrendingUp, Gauge } from 'lucide-react';
import { Loader } from '@googlemaps/js-api-loader';
import { supabase } from '@/integrations/supabase/client';
import { getKeyBody } from '@/lib/googleMapsKey';
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

/** Distance caméra derrière le coureur (m) — un peu plus sur les longs parcours. */
function chaseCameraBackMeters(polylineLengthM: number): number {
  if (polylineLengthM <= 0) return 130;
  return Math.min(240, Math.max(95, polylineLengthM * 0.035));
}

/** Distance de visée vers l’avant pour stabiliser le cap. */
function lookAheadMeters(polylineLengthM: number): number {
  if (polylineLengthM <= 0) return 180;
  return Math.min(320, Math.max(140, polylineLengthM * 0.045));
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
  const mapRef = useRef<google.maps.Map | null>(null);
  const remainingPolyRef = useRef<google.maps.Polyline | null>(null);
  const traveledPolyRef = useRef<google.maps.Polyline | null>(null);
  const traveledGlowRef = useRef<google.maps.Polyline | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const animationRef = useRef<number | null>(null);
  const introAnimationRef = useRef<number | null>(null);
  const introDoneRef = useRef(false);
  const introRunningRef = useRef(false);
  /** Centre caméra lissé (décalé vers l’avant du trajet — effet flyover / Strava) */
  const cameraCenterLatRef = useRef<number | null>(null);
  const cameraCenterLngRef = useRef<number | null>(null);
  /** Vitesse instantanée (lissée) pour HUD */
  const speedKmhSmoothRef = useRef(0);
  const lastSpeedSampleRef = useRef<{ pos: { lat: number; lng: number }; time: number } | null>(null);

  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [progress, setProgress] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  const [currentElevation, setCurrentElevation] = useState(0);
  const [currentSlope, setCurrentSlope] = useState(0);
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState(0);
  const [speed, setSpeed] = useState<1 | 2 | 3>(1);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdownNum, setCountdownNum] = useState(3);

  const progressRef = useRef(progress);
  progressRef.current = progress;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const currentSlopeRef = useRef(currentSlope);
  currentSlopeRef.current = currentSlope;

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

  // Initialize Google Maps
  useEffect(() => {
    if (!mapContainerRef.current || flyoverCoordinates.length < 2) return;

    const initMap = async () => {
      try {
        if (!window.google?.maps) {
          const { data: apiKeyData } = await supabase.functions.invoke('google-maps-proxy', {
            body: getKeyBody()
          });
          const apiKey = apiKeyData?.apiKey || '';
          const loader = new Loader({ apiKey, version: 'weekly', libraries: ['geometry', 'places'] });
          await loader.load();
        }

        if (!mapContainerRef.current) return;

        const centerLat = flyoverCoordinates.reduce((s, c) => s + c.lat, 0) / flyoverCoordinates.length;
        const centerLng = flyoverCoordinates.reduce((s, c) => s + c.lng, 0) / flyoverCoordinates.length;

        const map = new google.maps.Map(mapContainerRef.current, {
          center: { lat: centerLat, lng: centerLng },
          zoom: 15,
          mapTypeId: 'satellite',
          tilt: 67,
          heading: 0,
          disableDefaultUI: true,
          zoomControl: false,
          gestureHandling: 'greedy',
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: [
            { featureType: 'poi', stylers: [{ visibility: 'off' }] },
            { featureType: 'transit', stylers: [{ visibility: 'off' }] },
          ],
        });

        mapRef.current = map;

        const b = new google.maps.LatLngBounds();
        flyoverCoordinates.forEach(c => b.extend({ lat: c.lat, lng: c.lng }));
        map.fitBounds(b, 40);

        // Tronçon restant (mis à jour en flyover : seulement devant la position → sensation de révélation)
        const remainingPoly = new google.maps.Polyline({
          path: flyoverCoordinates.map(c => ({ lat: c.lat, lng: c.lng })),
          geodesic: true,
          strokeColor: '#FF5A1F',
          strokeOpacity: 0.38,
          strokeWeight: 6,
          map,
        });
        remainingPolyRef.current = remainingPoly;

        // Traveled glow (outer)
        const traveledGlow = new google.maps.Polyline({
          path: [],
          geodesic: true,
          strokeColor: '#34d399',
          strokeOpacity: 0.35,
          strokeWeight: 14,
          map,
        });
        traveledGlowRef.current = traveledGlow;

        // Traveled path (vivid)
        const traveledPoly = new google.maps.Polyline({
          path: [],
          geodesic: true,
          strokeColor: '#ffffff',
          strokeOpacity: 1,
          strokeWeight: 5,
          map,
        });
        traveledPolyRef.current = traveledPoly;

        // Start marker
        new google.maps.Marker({
          position: flyoverCoordinates[0],
          map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#22c55e',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
          },
          zIndex: 5,
        });

        // End marker
        new google.maps.Marker({
          position: flyoverCoordinates[flyoverCoordinates.length - 1],
          map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#ef4444',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
          },
          zIndex: 5,
        });

        // Drone marker — directional arrow
        const marker = new google.maps.Marker({
          position: flyoverCoordinates[0],
          map,
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 6.5,
            fillColor: '#2563eb',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2.5,
            rotation: 0,
          },
          zIndex: 10,
        });
        markerRef.current = marker;

        setMapReady(true);
      } catch (err) {
        console.error('Failed to init Google Maps 3D:', err);
      }
    };

    initMap();
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [flyoverCoordinates]);

  // Heading computation
  const computeHeading = useCallback((from: { lat: number; lng: number }, to: { lat: number; lng: number }) => {
    if (window.google?.maps?.geometry) {
      return google.maps.geometry.spherical.computeHeading(
        new google.maps.LatLng(from.lat, from.lng),
        new google.maps.LatLng(to.lat, to.lng)
      );
    }
    const dLng = (to.lng - from.lng) * Math.PI / 180;
    const lat1 = from.lat * Math.PI / 180;
    const lat2 = to.lat * Math.PI / 180;
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }, []);

  const runCinematicIntro = useCallback(() => {
    const map = mapRef.current;
    if (!map || flyoverCoordinates.length < 2) {
      setIsPlaying(true);
      return;
    }
    if (introRunningRef.current) return;

    if (introAnimationRef.current) cancelAnimationFrame(introAnimationRef.current);
    introRunningRef.current = true;
    setIsPlaying(false);

    const totalIdx = flyoverCoordinates.length - 1;
    const polylineLengthM = cumulativeDistances[totalIdx] || 0;
    const backM = chaseCameraBackMeters(polylineLengthM);
    const aheadM = lookAheadMeters(polylineLengthM);
    const startPos = flyoverCoordinates[0];
    const lookPos = flyoverCoordinates[Math.min(totalIdx, 6)];
    const heading = computeHeading(startPos, lookPos);

    let endCenter = { lat: startPos.lat, lng: startPos.lng };
    if (window.google?.maps?.geometry?.spherical) {
      const behind = google.maps.geometry.spherical.computeOffset(
        new google.maps.LatLng(startPos.lat, startPos.lng),
        backM,
        heading + 180
      );
      const ahead = google.maps.geometry.spherical.computeOffset(
        new google.maps.LatLng(startPos.lat, startPos.lng),
        aheadM,
        heading
      );
      endCenter = {
        lat: behind.lat() * 0.88 + ahead.lat() * 0.12,
        lng: behind.lng() * 0.88 + ahead.lng() * 0.12,
      };
    }

    const startBounds = new google.maps.LatLngBounds();
    flyoverCoordinates.forEach((c) => startBounds.extend(c));
    const startCenter = {
      lat: startBounds.getCenter().lat(),
      lng: startBounds.getCenter().lng(),
    };
    const startZoom = polylineLengthM > 20000 ? 12.6 : polylineLengthM > 9000 ? 13.2 : 13.8;
    const endZoom = 17.25;
    const startTilt = 28;
    const endTilt = 70;
    const durationMs = 1850;
    let t0 = 0;
    const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    const step = (ts: number) => {
      if (!t0) t0 = ts;
      const raw = clamp((ts - t0) / durationMs, 0, 1);
      const e = easeInOutCubic(raw);
      const center = {
        lat: startCenter.lat + (endCenter.lat - startCenter.lat) * e,
        lng: startCenter.lng + (endCenter.lng - startCenter.lng) * e,
      };
      map.moveCamera({
        center,
        zoom: startZoom + (endZoom - startZoom) * e,
        tilt: startTilt + (endTilt - startTilt) * e,
        heading: heading * e,
      });

      if (raw < 1) {
        introAnimationRef.current = requestAnimationFrame(step);
        return;
      }

      introAnimationRef.current = null;
      introRunningRef.current = false;
      introDoneRef.current = true;
      cameraCenterLatRef.current = endCenter.lat;
      cameraCenterLngRef.current = endCenter.lng;
      setProgress(0.002);
      progressRef.current = 0.002;
      setIsPlaying(true);
    };

    introAnimationRef.current = requestAnimationFrame(step);
  }, [flyoverCoordinates, cumulativeDistances, computeHeading]);

  // Animation loop — survol cinématique (caméra « chase », cap vers l’avant, tracé révélé)
  useEffect(() => {
    if (!mapReady || !mapRef.current || flyoverCoordinates.length < 2) return;

    let lastTime = 0;
    let headingSmooth = 0;
    let tiltSmooth = performanceTier === 'battery' ? 63 : performanceTier === 'balanced' ? 67 : 69;
    let zoomSmooth = performanceTier === 'battery' ? 17.05 : performanceTier === 'balanced' ? 17.25 : 17.4;
    const totalIdx = flyoverCoordinates.length - 1;
    const polylineLengthM = cumulativeDistances[totalIdx] || 0;
    const backM = chaseCameraBackMeters(polylineLengthM);
    const aheadM = lookAheadMeters(polylineLengthM);
    const targetDurationS = clamp(polylineLengthM / 78, 36, 170);
    const baseMps = polylineLengthM > 0 ? polylineLengthM / targetDurationS : 0;

    const animate = (timestamp: number) => {
      if (!isPlayingRef.current) {
        lastTime = 0;
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

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
      let dynamicMps = baseMps * speedMultiplier;
      const slopeForPace = currentSlopeRef.current;
      if (slopeForPace > 0) dynamicMps *= clamp(1 - slopeForPace / 48, 0.72, 1);
      if (slopeForPace < 0) dynamicMps *= clamp(1 + Math.abs(slopeForPace) / 80, 1, 1.22);
      let newProgress = progressRef.current + (polylineLengthM > 0 ? (delta * dynamicMps) / polylineLengthM : 0);
      if (newProgress >= 1) {
        newProgress = 0;
        setIsPlaying(false);
        cameraCenterLatRef.current = null;
        cameraCenterLngRef.current = null;
        lastSpeedSampleRef.current = null;
      }

      setProgress(newProgress);
      progressRef.current = newProgress;

      const distNow = newProgress * polylineLengthM;
      const { pos: currentPos, segIndex: idx, segT: frac } = positionAlongRouteAtDistance(
        flyoverCoordinates,
        cumulativeDistances,
        distNow
      );

      // Vitesse instantanée (HUD)
      const sample = lastSpeedSampleRef.current;
      if (sample && delta > 1e-4) {
        const movedM = haversine(sample.pos, currentPos);
        const kmh = (movedM / delta) * 3.6;
        speedKmhSmoothRef.current = speedKmhSmoothRef.current * 0.82 + kmh * 0.18;
        setCurrentSpeedKmh(Math.round(speedKmhSmoothRef.current));
      }
      lastSpeedSampleRef.current = { pos: { ...currentPos }, time: timestamp };

      if (markerRef.current) {
        markerRef.current.setPosition(currentPos);
      }

      const trailPath = flyoverCoordinates.slice(0, idx + 1).map(c => ({ lat: c.lat, lng: c.lng }));
      trailPath.push(currentPos);
      traveledPolyRef.current?.setPath(trailPath);
      traveledGlowRef.current?.setPath(trailPath);

      const remainingPath: google.maps.LatLngLiteral[] = [{ ...currentPos }];
      for (let k = idx + 1; k <= totalIdx; k++) {
        remainingPath.push({ lat: flyoverCoordinates[k].lat, lng: flyoverCoordinates[k].lng });
      }
      remainingPolyRef.current?.setPath(remainingPath);

      if (flyoverElevations.length > idx + 1) {
        const elev = flyoverElevations[idx] + (flyoverElevations[idx + 1] - flyoverElevations[idx]) * frac;
        setCurrentElevation(Math.round(elev));
      }

      const slopeVal = slopes[idx] || 0;
      const smoothSlope = slopeVal + ((slopes[Math.min(idx + 1, totalIdx)] || 0) - slopeVal) * frac;
      setCurrentSlope(Math.round(smoothSlope * 10) / 10);

      const lookDist = Math.min(distNow + aheadM, polylineLengthM);
      const { pos: lookPos } = positionAlongRouteAtDistance(flyoverCoordinates, cumulativeDistances, lookDist);
      const targetHeading = computeHeading(currentPos, lookPos);

      let diff = normalizeAngleDiff(targetHeading - headingSmooth);
      const headingLerp = polylineLengthM > 5000 ? 0.055 : 0.075;
      headingSmooth += diff * headingLerp;

      if (markerRef.current) {
        const icon = markerRef.current.getIcon() as google.maps.Symbol;
        if (icon) {
          markerRef.current.setIcon({ ...icon, rotation: headingSmooth });
        }
      }

      const turnIntensity = Math.abs(diff);
      const turnSign = diff >= 0 ? 1 : -1;
      const dynamicAheadM = aheadM + Math.min(120, turnIntensity * 2.4);
      const dynamicBackM = backM + Math.min(48, Math.abs(smoothSlope) * 2);
      const tierTiltBase = performanceTier === 'battery' ? 66.5 : performanceTier === 'balanced' ? 69 : 71;
      const targetTilt =
        tierTiltBase +
        Math.max(-8, Math.min(6, smoothSlope * 0.45)) -
        Math.min(7, turnIntensity * 0.12);
      tiltSmooth += (targetTilt - tiltSmooth) * 0.045;

      const targetZoom =
        performanceTier === 'battery'
          ? turnIntensity > 18 ? 16.5 : turnIntensity > 10 ? 16.9 : 17.1
          : performanceTier === 'balanced'
            ? turnIntensity > 18 ? 16.35 : turnIntensity > 10 ? 16.88 : 17.3
            : turnIntensity > 18 ? 16.25 : turnIntensity > 10 ? 16.85 : 17.45;
      zoomSmooth += (targetZoom - zoomSmooth) * 0.035;

      const map = mapRef.current;
      if (map && window.google?.maps?.geometry?.spherical) {
        const behind = google.maps.geometry.spherical.computeOffset(
          new google.maps.LatLng(currentPos.lat, currentPos.lng),
          dynamicBackM,
          headingSmooth + 180
        );
        const maxSide = performanceTier === 'battery' ? 12 : performanceTier === 'balanced' ? 18 : 24;
        const sideOffsetM = Math.min(maxSide, turnIntensity * 0.8);
        const sideBearing = headingSmooth + (turnSign > 0 ? -90 : 90);
        const side = google.maps.geometry.spherical.computeOffset(
          behind,
          sideOffsetM,
          sideBearing
        );
        const lookAnchor = google.maps.geometry.spherical.computeOffset(
          new google.maps.LatLng(currentPos.lat, currentPos.lng),
          dynamicAheadM,
          headingSmooth
        );
        const targetCam = {
          lat: side.lat() * 0.88 + lookAnchor.lat() * 0.12,
          lng: side.lng() * 0.88 + lookAnchor.lng() * 0.12,
        };
        const camLerp = performanceTier === 'battery' ? 0.1 : 0.15;
        if (cameraCenterLatRef.current === null || cameraCenterLngRef.current === null) {
          cameraCenterLatRef.current = targetCam.lat;
          cameraCenterLngRef.current = targetCam.lng;
        } else {
          cameraCenterLatRef.current += (targetCam.lat - cameraCenterLatRef.current) * camLerp;
          cameraCenterLngRef.current += (targetCam.lng - cameraCenterLngRef.current) * camLerp;
        }

        map.moveCamera({
          center: { lat: cameraCenterLatRef.current, lng: cameraCenterLngRef.current },
          heading: headingSmooth,
          tilt: tiltSmooth,
          zoom: zoomSmooth,
        });
      } else if (map) {
        map.moveCamera({
          center: currentPos,
          heading: headingSmooth,
          tilt: tiltSmooth,
          zoom: zoomSmooth,
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [mapReady, flyoverCoordinates, flyoverElevations, slopes, computeHeading, cumulativeDistances, performanceTier]);

  const handlePlayPause = useCallback(() => {
    if (!isPlaying && progress === 0) {
      setCountdownNum(3);
      setShowCountdown(true);
      let count = 3;
      const interval = setInterval(() => {
        count--;
        if (count > 0) {
          setCountdownNum(count);
        } else {
          clearInterval(interval);
          setShowCountdown(false);
          if (!introDoneRef.current) runCinematicIntro();
          else setIsPlaying(true);
        }
      }, 600);
    } else {
      setIsPlaying(p => !p);
    }
  }, [isPlaying, progress, runCinematicIntro]);

  const handleRecenter = useCallback(() => {
    setIsPlaying(false);
    setProgress(0);
    progressRef.current = 0;
    cameraCenterLatRef.current = null;
    cameraCenterLngRef.current = null;
    lastSpeedSampleRef.current = null;
    speedKmhSmoothRef.current = 0;
    setCurrentSpeedKmh(0);
    introDoneRef.current = false;
    introRunningRef.current = false;
    if (introAnimationRef.current) {
      cancelAnimationFrame(introAnimationRef.current);
      introAnimationRef.current = null;
    }
    if (!mapRef.current || flyoverCoordinates.length < 2) return;
    traveledPolyRef.current?.setPath([]);
    traveledGlowRef.current?.setPath([]);
    remainingPolyRef.current?.setPath(flyoverCoordinates.map(c => ({ lat: c.lat, lng: c.lng })));
    markerRef.current?.setPosition(flyoverCoordinates[0]);
    const icon = markerRef.current?.getIcon() as google.maps.Symbol | undefined;
    if (icon) markerRef.current?.setIcon({ ...icon, rotation: 0 });
    const b = new google.maps.LatLngBounds();
    flyoverCoordinates.forEach(c => b.extend({ lat: c.lat, lng: c.lng }));
    mapRef.current.moveCamera({ tilt: 45, heading: 0 });
    mapRef.current.fitBounds(b, 40);
  }, [flyoverCoordinates]);

  useEffect(() => {
    return () => {
      if (introAnimationRef.current) cancelAnimationFrame(introAnimationRef.current);
    };
  }, []);

  const cycleSpeed = useCallback(() => {
    setSpeed(s => s === 1 ? 2 : s === 2 ? 3 : 1);
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
