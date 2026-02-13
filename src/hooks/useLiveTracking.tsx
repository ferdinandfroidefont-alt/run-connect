import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

interface LiveTrackingPoint {
  lat: number;
  lng: number;
  accuracy: number;
  recorded_at: string;
}

interface UseLiveTrackingOptions {
  sessionId: string;
  userId: string;
  isOrganizer: boolean;
  maxDurationMinutes?: number;
}

export const useLiveTracking = ({
  sessionId,
  userId,
  isOrganizer,
  maxDurationMinutes = 120,
}: UseLiveTrackingOptions) => {
  const [isTracking, setIsTracking] = useState(false);
  const [trackingPoints, setTrackingPoints] = useState<LiveTrackingPoint[]>([]);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const watchIdRef = useRef<string | null>(null);
  const autoStopTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Listen to realtime tracking updates (for participants)
  useEffect(() => {
    if (!sessionId || isOrganizer) return;

    const channel = supabase
      .channel(`live-tracking-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_tracking_points',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const point = payload.new as any;
          setTrackingPoints((prev) => [
            ...prev,
            {
              lat: Number(point.lat),
              lng: Number(point.lng),
              accuracy: Number(point.accuracy),
              recorded_at: point.recorded_at,
            },
          ]);
          setCurrentPosition({
            lat: Number(point.lat),
            lng: Number(point.lng),
          });
        }
      )
      .subscribe();

    // Load existing points
    const loadPoints = async () => {
      const { data } = await supabase
        .from('live_tracking_points' as any)
        .select('lat, lng, accuracy, recorded_at')
        .eq('session_id', sessionId)
        .order('recorded_at', { ascending: true });

      if (data && data.length > 0) {
        const points = (data as any[]).map((p) => ({
          lat: Number(p.lat),
          lng: Number(p.lng),
          accuracy: Number(p.accuracy),
          recorded_at: p.recorded_at,
        }));
        setTrackingPoints(points);
        const last = points[points.length - 1];
        setCurrentPosition({ lat: last.lat, lng: last.lng });
      }
    };

    loadPoints();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, isOrganizer]);

  // Auto-stop timer
  useEffect(() => {
    if (!isTracking || !startedAt) return;

    const checkAutoStop = () => {
      const elapsed = (Date.now() - startedAt.getTime()) / 60000;
      if (elapsed >= maxDurationMinutes) {
        stopTracking();
      }
    };

    autoStopTimerRef.current = setInterval(checkAutoStop, 30000);
    return () => {
      if (autoStopTimerRef.current) clearInterval(autoStopTimerRef.current);
    };
  }, [isTracking, startedAt, maxDurationMinutes]);

  const startTracking = useCallback(async () => {
    if (!isOrganizer) return;

    try {
      // Update session status
      await supabase
        .from('sessions')
        .update({
          live_tracking_active: true,
          live_tracking_started_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      setStartedAt(new Date());
      setIsTracking(true);

      if (Capacitor.isNativePlatform()) {
        const id = await Geolocation.watchPosition(
          { enableHighAccuracy: true },
          async (position) => {
            if (!position) return;

            const point = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
            };

            setCurrentPosition({ lat: point.lat, lng: point.lng });

            await supabase.from('live_tracking_points' as any).insert({
              session_id: sessionId,
              user_id: userId,
              lat: point.lat,
              lng: point.lng,
              accuracy: point.accuracy,
            });
          }
        );
        watchIdRef.current = id;
      } else {
        // Web fallback - use interval
        const sendPosition = async () => {
          try {
            const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
            const point = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            };

            setCurrentPosition({ lat: point.lat, lng: point.lng });

            await supabase.from('live_tracking_points' as any).insert({
              session_id: sessionId,
              user_id: userId,
              lat: point.lat,
              lng: point.lng,
              accuracy: point.accuracy,
            });
          } catch (err) {
            console.error('GPS error:', err);
          }
        };

        sendPosition();
        const intervalId = setInterval(sendPosition, 5000);
        watchIdRef.current = String(intervalId);
      }
    } catch (error) {
      console.error('Failed to start tracking:', error);
      setIsTracking(false);
    }
  }, [isOrganizer, sessionId, userId]);

  const stopTracking = useCallback(async () => {
    setIsTracking(false);

    if (watchIdRef.current) {
      if (Capacitor.isNativePlatform()) {
        await Geolocation.clearWatch({ id: watchIdRef.current });
      } else {
        clearInterval(Number(watchIdRef.current));
      }
      watchIdRef.current = null;
    }

    if (autoStopTimerRef.current) {
      clearInterval(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }

    // Update session status
    await supabase
      .from('sessions')
      .update({
        live_tracking_active: false,
      })
      .eq('id', sessionId);
  }, [sessionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isTracking) {
        stopTracking();
      }
    };
  }, []);

  return {
    isTracking,
    trackingPoints,
    currentPosition,
    startedAt,
    startTracking,
    stopTracking,
    elapsedMinutes: startedAt ? Math.floor((Date.now() - startedAt.getTime()) / 60000) : 0,
  };
};
