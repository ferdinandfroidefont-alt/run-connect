import { useState, useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { supabase } from '@/integrations/supabase/client';

interface Coord {
  lat: number;
  lng: number;
}

export interface TurnInstruction {
  direction: 'left' | 'right' | 'slight-left' | 'slight-right' | 'straight' | 'u-turn';
  distanceMeters: number;
  segmentIndex: number;
}

interface TrainingState {
  routeCoordinates: Coord[];
  userPosition: Coord | null;
  heading: number;
  remainingDistance: number;
  isOffRoute: boolean;
  isActive: boolean;
  isPaused: boolean;
  elapsedTime: number;
  loading: boolean;
  error: string | null;
  sessionTitle: string;
  routeName: string;
  nextTurn: TurnInstruction | null;
  distanceTraveled: number;
  elevationGain: number;
  averageSpeed: number;
  activityType: string;
  traveledPath: Coord[];
}

// Haversine distance in meters
function haversine(a: Coord, b: Coord): number {
  const R = 6371000;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function projectOnRoute(point: Coord, route: Coord[]): { segmentIndex: number; minDist: number; projected: Coord } {
  let minDist = Infinity;
  let bestIndex = 0;
  let bestProjected = route[0];

  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i];
    const b = route[i + 1];
    const dx = b.lng - a.lng;
    const dy = b.lat - a.lat;
    const lenSq = dx * dx + dy * dy;
    let t = 0;
    if (lenSq > 0) {
      t = ((point.lng - a.lng) * dx + (point.lat - a.lat) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
    }
    const projected: Coord = { lat: a.lat + t * dy, lng: a.lng + t * dx };
    const dist = haversine(point, projected);
    if (dist < minDist) {
      minDist = dist;
      bestIndex = i;
      bestProjected = projected;
    }
  }

  return { segmentIndex: bestIndex, minDist, projected: bestProjected };
}

function calculateRemainingDistance(segmentIndex: number, projected: Coord, route: Coord[]): number {
  if (route.length < 2) return 0;
  let remaining = haversine(projected, route[segmentIndex + 1]);
  for (let i = segmentIndex + 1; i < route.length - 1; i++) {
    remaining += haversine(route[i], route[i + 1]);
  }
  return remaining;
}

function detectTurns(route: Coord[]): TurnInstruction[] {
  const turns: TurnInstruction[] = [];
  if (route.length < 3) return turns;

  for (let i = 1; i < route.length - 1; i++) {
    const a = route[i - 1];
    const b = route[i];
    const c = route[i + 1];

    const angle1 = Math.atan2(b.lng - a.lng, b.lat - a.lat);
    const angle2 = Math.atan2(c.lng - b.lng, c.lat - b.lat);
    let diff = (angle2 - angle1) * 180 / Math.PI;

    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;

    const absDiff = Math.abs(diff);
    if (absDiff < 25) continue;

    let direction: TurnInstruction['direction'];
    if (absDiff > 150) {
      direction = 'u-turn';
    } else if (absDiff > 60) {
      direction = diff > 0 ? 'right' : 'left';
    } else {
      direction = diff > 0 ? 'slight-right' : 'slight-left';
    }

    turns.push({ direction, distanceMeters: 0, segmentIndex: i });
  }

  return turns;
}

function distanceAlongRoute(fromSegIdx: number, fromProjected: Coord, toPointIdx: number, route: Coord[]): number {
  if (toPointIdx <= fromSegIdx) return 0;
  let dist = haversine(fromProjected, route[fromSegIdx + 1]);
  for (let i = fromSegIdx + 1; i < toPointIdx; i++) {
    dist += haversine(route[i], route[i + 1]);
  }
  return dist;
}

export function useTrainingMode(sessionId: string | undefined, routeId?: string | undefined) {
  const [state, setState] = useState<TrainingState>({
    routeCoordinates: [],
    userPosition: null,
    heading: 0,
    remainingDistance: 0,
    isOffRoute: false,
    isActive: false,
    isPaused: false,
    elapsedTime: 0,
    loading: true,
    error: null,
    sessionTitle: '',
    routeName: '',
    nextTurn: null,
    distanceTraveled: 0,
    elevationGain: 0,
    averageSpeed: 0,
    activityType: 'running',
    traveledPath: [],
  });

  const watchIdRef = useRef<string | number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedElapsedRef = useRef<number>(0);
  const prevPositionRef = useRef<Coord | null>(null);
  const offRouteTimerRef = useRef<number>(0);
  const lastOffRouteAlertRef = useRef<number>(0);
  const turnsRef = useRef<TurnInstruction[]>([]);
  const vibratedTurnIdxRef = useRef<number>(-1);
  const orientationHandlerRef = useRef<((e: DeviceOrientationEvent) => void) | null>(null);
  const lastAltitudeRef = useRef<number | null>(null);
  const distanceTraveledRef = useRef<number>(0);
  const elevationGainRef = useRef<number>(0);

  // Load session & route data
  useEffect(() => {
    const loadData = async () => {
      try {
        if (routeId) {
          const { data: route, error: routeError } = await supabase
            .from('routes')
            .select('name, coordinates, activity_type')
            .eq('id', routeId)
            .single();

          if (routeError || !route) {
            setState(s => ({ ...s, loading: false, error: 'Itinéraire introuvable' }));
            return;
          }

          const coords: Coord[] = (route.coordinates as any[]).map((c: any) => ({
            lat: typeof c.lat === 'number' ? c.lat : parseFloat(c.lat),
            lng: typeof c.lng === 'number' ? c.lng : parseFloat(c.lng),
          }));

          let totalDist = 0;
          for (let i = 0; i < coords.length - 1; i++) {
            totalDist += haversine(coords[i], coords[i + 1]);
          }

          turnsRef.current = detectTurns(coords);

          setState(s => ({
            ...s,
            routeCoordinates: coords,
            remainingDistance: totalDist,
            loading: false,
            sessionTitle: route.name,
            routeName: route.name,
            activityType: route.activity_type || 'running',
          }));
          return;
        }

        if (!sessionId) {
          setState(s => ({ ...s, loading: false, error: 'Aucun itinéraire spécifié' }));
          return;
        }

        const { data: session, error: sessionError } = await supabase
          .from('sessions')
          .select('title, route_id, activity_type')
          .eq('id', sessionId)
          .single();

        if (sessionError || !session?.route_id) {
          setState(s => ({ ...s, loading: false, error: 'Session ou itinéraire introuvable' }));
          return;
        }

        const { data: route, error: routeError } = await supabase
          .from('routes')
          .select('name, coordinates')
          .eq('id', session.route_id)
          .single();

        if (routeError || !route) {
          setState(s => ({ ...s, loading: false, error: 'Itinéraire introuvable' }));
          return;
        }

        const coords: Coord[] = (route.coordinates as any[]).map((c: any) => ({
          lat: typeof c.lat === 'number' ? c.lat : parseFloat(c.lat),
          lng: typeof c.lng === 'number' ? c.lng : parseFloat(c.lng),
        }));

        let totalDist = 0;
        for (let i = 0; i < coords.length - 1; i++) {
          totalDist += haversine(coords[i], coords[i + 1]);
        }

        turnsRef.current = detectTurns(coords);

        setState(s => ({
          ...s,
          routeCoordinates: coords,
          remainingDistance: totalDist,
          loading: false,
          sessionTitle: session.title,
          routeName: route.name,
          activityType: (session as any).activity_type || 'running',
        }));
      } catch (err) {
        setState(s => ({ ...s, loading: false, error: 'Erreur de chargement' }));
      }
    };

    loadData();
  }, [sessionId, routeId]);

  const handlePosition = useCallback((lat: number, lng: number, accuracy: number, gpsHeading?: number | null, altitude?: number | null) => {
    if (accuracy > 50) return;

    let newPos: Coord = { lat, lng };

    if (prevPositionRef.current) {
      const jump = haversine(prevPositionRef.current, newPos);
      if (jump > 20) {
        newPos = {
          lat: (prevPositionRef.current.lat + newPos.lat) / 2,
          lng: (prevPositionRef.current.lng + newPos.lng) / 2,
        };
      }
      // Accumulate distance traveled (only if reasonable movement, >2m)
      const moved = haversine(prevPositionRef.current, newPos);
      if (moved > 2 && moved < 100) {
        distanceTraveledRef.current += moved;
      }
    }
    prevPositionRef.current = newPos;

    // Track elevation gain
    if (altitude != null && !isNaN(altitude)) {
      if (lastAltitudeRef.current != null) {
        const delta = altitude - lastAltitudeRef.current;
        if (delta > 0.5) { // only positive, with 0.5m threshold to filter noise
          elevationGainRef.current += delta;
        }
      }
      lastAltitudeRef.current = altitude;
    }

    setState(prev => {
      const updatedTraveledPath = [...prev.traveledPath, newPos];

      if (prev.routeCoordinates.length < 2) {
        return {
          ...prev,
          userPosition: newPos,
          traveledPath: updatedTraveledPath,
          distanceTraveled: distanceTraveledRef.current,
          elevationGain: elevationGainRef.current,
        };
      }

      const { segmentIndex, minDist, projected } = projectOnRoute(newPos, prev.routeCoordinates);
      const remaining = calculateRemainingDistance(segmentIndex, projected, prev.routeCoordinates);

      const now = Date.now();
      let isOffRoute = prev.isOffRoute;
      if (minDist > 20) {
        if (offRouteTimerRef.current === 0) {
          offRouteTimerRef.current = now;
        } else if (now - offRouteTimerRef.current > 5000) {
          isOffRoute = true;
          if (now - lastOffRouteAlertRef.current > 30000) {
            lastOffRouteAlertRef.current = now;
            try { navigator.vibrate?.(200); } catch {}
          }
        }
      } else {
        offRouteTimerRef.current = 0;
        isOffRoute = false;
      }

      let nextTurn: TurnInstruction | null = null;
      const turns = turnsRef.current;
      for (const turn of turns) {
        if (turn.segmentIndex > segmentIndex) {
          const dist = distanceAlongRoute(segmentIndex, projected, turn.segmentIndex, prev.routeCoordinates);
          nextTurn = { ...turn, distanceMeters: Math.round(dist) };
          if (dist < 50 && vibratedTurnIdxRef.current !== turn.segmentIndex) {
            vibratedTurnIdxRef.current = turn.segmentIndex;
            try { navigator.vibrate?.(100); } catch {}
          }
          break;
        }
      }

      return {
        ...prev,
        userPosition: newPos,
        remainingDistance: remaining,
        isOffRoute,
        heading: gpsHeading ?? prev.heading,
        nextTurn,
        traveledPath: updatedTraveledPath,
        distanceTraveled: distanceTraveledRef.current,
        elevationGain: elevationGainRef.current,
      };
    });
  }, []);

  const startGPSWatch = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const id = await Geolocation.watchPosition(
          { enableHighAccuracy: true, timeout: 10000, minimumUpdateInterval: 3000 },
          (pos) => {
            if (pos) {
              handlePosition(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy, pos.coords.heading, pos.coords.altitude);
            }
          }
        );
        watchIdRef.current = id;
      } catch {
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => handlePosition(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy, pos.coords.heading, pos.coords.altitude),
          () => {},
          { enableHighAccuracy: true, timeout: 10000 }
        );
      }
    } else {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => handlePosition(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy, pos.coords.heading, pos.coords.altitude),
        () => {},
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, [handlePosition]);

  const stopGPSWatch = useCallback(async () => {
    if (watchIdRef.current !== null) {
      if (Capacitor.isNativePlatform() && typeof watchIdRef.current === 'string') {
        await Geolocation.clearWatch({ id: watchIdRef.current });
      } else if (typeof watchIdRef.current === 'number') {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      watchIdRef.current = null;
    }
  }, []);

  const startTracking = useCallback(async () => {
    setState(s => ({ ...s, isActive: true, isPaused: false }));
    startTimeRef.current = Date.now();
    pausedElapsedRef.current = 0;
    distanceTraveledRef.current = 0;
    elevationGainRef.current = 0;

    timerRef.current = setInterval(() => {
      setState(s => {
        if (s.isPaused) return s;
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000) - pausedElapsedRef.current;
        const speedKmh = elapsed > 0 ? (distanceTraveledRef.current / 1000) / (elapsed / 3600) : 0;
        return {
          ...s,
          elapsedTime: elapsed,
          averageSpeed: Math.round(speedKmh * 10) / 10,
          distanceTraveled: distanceTraveledRef.current,
          elevationGain: elevationGainRef.current,
        };
      });
    }, 1000);

    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      }
    } catch {}

    const handleOrientation = (e: DeviceOrientationEvent) => {
      const h = (e as any).webkitCompassHeading ?? (e.alpha != null ? 360 - e.alpha : 0);
      setState(s => ({ ...s, heading: h }));
    };
    orientationHandlerRef.current = handleOrientation;

    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const perm = await (DeviceOrientationEvent as any).requestPermission();
        if (perm === 'granted') {
          window.addEventListener('deviceorientation', handleOrientation, true);
        }
      } catch {}
    } else {
      window.addEventListener('deviceorientation', handleOrientation, true);
    }

    await startGPSWatch();
  }, [startGPSWatch]);

  const pauseTracking = useCallback(async () => {
    setState(s => ({ ...s, isPaused: true }));
    await stopGPSWatch();
  }, [stopGPSWatch]);

  const resumeTracking = useCallback(async () => {
    setState(s => ({ ...s, isPaused: false }));
    await startGPSWatch();
  }, [startGPSWatch]);

  const stopTracking = useCallback(async () => {
    setState(s => ({ ...s, isActive: false, isPaused: false }));

    if (timerRef.current) clearInterval(timerRef.current);
    await stopGPSWatch();

    if (wakeLockRef.current) {
      try { await wakeLockRef.current.release(); } catch {}
      wakeLockRef.current = null;
    }

    if (orientationHandlerRef.current) {
      window.removeEventListener('deviceorientation', orientationHandlerRef.current, true);
      orientationHandlerRef.current = null;
    }
  }, [stopGPSWatch]);

  useEffect(() => {
    return () => { stopTracking(); };
  }, [stopTracking]);

  return {
    ...state,
    startTracking,
    stopTracking,
    pauseTracking,
    resumeTracking,
  };
}
