import { useState, useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { supabase } from '@/integrations/supabase/client';

interface Coord {
  lat: number;
  lng: number;
}

interface TrainingState {
  routeCoordinates: Coord[];
  userPosition: Coord | null;
  heading: number;
  remainingDistance: number;
  isOffRoute: boolean;
  isActive: boolean;
  elapsedTime: number;
  loading: boolean;
  error: string | null;
  sessionTitle: string;
  routeName: string;
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

// Project point onto nearest segment, return { index, distance, projected }
function projectOnRoute(point: Coord, route: Coord[]): { segmentIndex: number; minDist: number; projected: Coord } {
  let minDist = Infinity;
  let bestIndex = 0;
  let bestProjected = route[0];

  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i];
    const b = route[i + 1];
    
    // Simple projection on segment
    const dx = b.lng - a.lng;
    const dy = b.lat - a.lat;
    const lenSq = dx * dx + dy * dy;
    
    let t = 0;
    if (lenSq > 0) {
      t = ((point.lng - a.lng) * dx + (point.lat - a.lat) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
    }
    
    const projected: Coord = {
      lat: a.lat + t * dy,
      lng: a.lng + t * dx,
    };
    
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
  
  // Distance from projected point to end of current segment
  let remaining = haversine(projected, route[segmentIndex + 1]);
  
  // Sum remaining segments
  for (let i = segmentIndex + 1; i < route.length - 1; i++) {
    remaining += haversine(route[i], route[i + 1]);
  }
  
  return remaining;
}

export function useTrainingMode(sessionId: string | undefined, routeId?: string | undefined) {
  const [state, setState] = useState<TrainingState>({
    routeCoordinates: [],
    userPosition: null,
    heading: 0,
    remainingDistance: 0,
    isOffRoute: false,
    isActive: false,
    elapsedTime: 0,
    loading: true,
    error: null,
    sessionTitle: '',
    routeName: '',
  });

  const watchIdRef = useRef<string | number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const prevPositionRef = useRef<Coord | null>(null);
  const offRouteTimerRef = useRef<number>(0);
  const lastOffRouteAlertRef = useRef<number>(0);

  // Load session & route data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Mode 1: Load from route directly
        if (routeId) {
          const { data: route, error: routeError } = await supabase
            .from('routes')
            .select('name, coordinates')
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

          setState(s => ({
            ...s,
            routeCoordinates: coords,
            remainingDistance: totalDist,
            loading: false,
            sessionTitle: route.name,
            routeName: route.name,
          }));
          return;
        }

        // Mode 2: Load from session
        if (!sessionId) {
          setState(s => ({ ...s, loading: false, error: 'Aucun itinéraire spécifié' }));
          return;
        }

        const { data: session, error: sessionError } = await supabase
          .from('sessions')
          .select('title, route_id')
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

        setState(s => ({
          ...s,
          routeCoordinates: coords,
          remainingDistance: totalDist,
          loading: false,
          sessionTitle: session.title,
          routeName: route.name,
        }));
      } catch (err) {
        setState(s => ({ ...s, loading: false, error: 'Erreur de chargement' }));
      }
    };

    loadData();
  }, [sessionId, routeId]);

  const handlePosition = useCallback((lat: number, lng: number, accuracy: number, gpsHeading?: number | null) => {
    // Filter bad GPS
    if (accuracy > 50) return;

    let newPos: Coord = { lat, lng };

    // Smooth jumps > 20m
    if (prevPositionRef.current) {
      const jump = haversine(prevPositionRef.current, newPos);
      if (jump > 20) {
        newPos = {
          lat: (prevPositionRef.current.lat + newPos.lat) / 2,
          lng: (prevPositionRef.current.lng + newPos.lng) / 2,
        };
      }
    }
    prevPositionRef.current = newPos;

    setState(prev => {
      if (prev.routeCoordinates.length < 2) return { ...prev, userPosition: newPos };

      const { segmentIndex, minDist, projected } = projectOnRoute(newPos, prev.routeCoordinates);
      const remaining = calculateRemainingDistance(segmentIndex, projected, prev.routeCoordinates);

      // Off-route detection
      const now = Date.now();
      let isOffRoute = prev.isOffRoute;
      
      if (minDist > 30) {
        if (offRouteTimerRef.current === 0) {
          offRouteTimerRef.current = now;
        } else if (now - offRouteTimerRef.current > 5000) {
          isOffRoute = true;
          // Vibrate with cooldown
          if (now - lastOffRouteAlertRef.current > 30000) {
            lastOffRouteAlertRef.current = now;
            try { navigator.vibrate?.(200); } catch {}
          }
        }
      } else {
        offRouteTimerRef.current = 0;
        isOffRoute = false;
      }

      return {
        ...prev,
        userPosition: newPos,
        remainingDistance: remaining,
        isOffRoute,
        heading: gpsHeading ?? prev.heading,
      };
    });
  }, []);

  const startTracking = useCallback(async () => {
    setState(s => ({ ...s, isActive: true }));
    startTimeRef.current = Date.now();

    // Elapsed time timer
    timerRef.current = setInterval(() => {
      setState(s => ({ ...s, elapsedTime: Math.floor((Date.now() - startTimeRef.current) / 1000) }));
    }, 1000);

    // Wake lock
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      }
    } catch {}

    // Compass via DeviceOrientation
    const handleOrientation = (e: DeviceOrientationEvent) => {
      const heading = (e as any).webkitCompassHeading ?? (e.alpha != null ? 360 - e.alpha : 0);
      setState(s => ({ ...s, heading }));
    };

    // Request iOS permission
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

    // GPS tracking
    if (Capacitor.isNativePlatform()) {
      try {
        const id = await Geolocation.watchPosition(
          { enableHighAccuracy: true, timeout: 10000, minimumUpdateInterval: 3000 },
          (pos) => {
            if (pos) {
              handlePosition(
                pos.coords.latitude,
                pos.coords.longitude,
                pos.coords.accuracy,
                pos.coords.heading
              );
            }
          }
        );
        watchIdRef.current = id;
      } catch (err) {
        // Fallback web
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => handlePosition(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy, pos.coords.heading),
          () => {},
          { enableHighAccuracy: true, timeout: 10000 }
        );
      }
    } else {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => handlePosition(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy, pos.coords.heading),
        () => {},
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, [handlePosition]);

  const stopTracking = useCallback(async () => {
    setState(s => ({ ...s, isActive: false }));

    if (timerRef.current) clearInterval(timerRef.current);

    if (watchIdRef.current !== null) {
      if (Capacitor.isNativePlatform() && typeof watchIdRef.current === 'string') {
        await Geolocation.clearWatch({ id: watchIdRef.current });
      } else if (typeof watchIdRef.current === 'number') {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      watchIdRef.current = null;
    }

    if (wakeLockRef.current) {
      try { await wakeLockRef.current.release(); } catch {}
      wakeLockRef.current = null;
    }

    window.removeEventListener('deviceorientation', () => {}, true);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  return {
    ...state,
    startTracking,
    stopTracking,
  };
}
