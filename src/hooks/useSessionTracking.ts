import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

interface ParticipantPosition {
  lat: number;
  lng: number;
  avatar_url: string | null;
  username: string | null;
  display_name: string | null;
}

interface RouteCoord {
  lat: number;
  lng: number;
}

interface SessionData {
  id: string;
  title: string;
  location_lat: number;
  location_lng: number;
  route_id: string | null;
  organizer_id: string;
  live_tracking_active: boolean | null;
}

export function useSessionTracking(sessionId: string | undefined) {
  const { user } = useAuth();
  const [session, setSession] = useState<SessionData | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<RouteCoord[]>([]);
  const [participantPositions, setParticipantPositions] = useState<Map<string, ParticipantPosition>>(new Map());
  const [participantProfiles, setParticipantProfiles] = useState<Map<string, { avatar_url: string | null; username: string | null; display_name: string | null }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null);
  const watchIdRef = useRef<string | number | null>(null);
  const sendIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSentRef = useRef<{ lat: number; lng: number } | null>(null);

  // Load session + participants + route
  useEffect(() => {
    if (!sessionId || !user) return;

    const load = async () => {
      setLoading(true);
      try {
        // Load session
        const { data: sess, error: sessErr } = await supabase
          .from('sessions')
          .select('id, title, location_lat, location_lng, route_id, organizer_id, live_tracking_active')
          .eq('id', sessionId)
          .single();
        if (sessErr) throw sessErr;
        setSession(sess);

        // Load participants with profiles
        const { data: participants } = await supabase
          .from('session_participants')
          .select('user_id')
          .eq('session_id', sessionId);

        const participantIds = participants?.map(p => p.user_id) || [];
        // Include organizer
        if (!participantIds.includes(sess.organizer_id)) {
          participantIds.push(sess.organizer_id);
        }

        if (participantIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, avatar_url, username, display_name')
            .in('user_id', participantIds);

          const profileMap = new Map<string, { avatar_url: string | null; username: string | null; display_name: string | null }>();
          profiles?.forEach(p => {
            if (p.user_id) profileMap.set(p.user_id, { avatar_url: p.avatar_url, username: p.username, display_name: p.display_name });
          });
          setParticipantProfiles(profileMap);
        }

        // Load route if exists
        if (sess.route_id) {
          const { data: route } = await supabase
            .from('routes')
            .select('coordinates')
            .eq('id', sess.route_id)
            .single();

          if (route?.coordinates) {
            const coords = route.coordinates as any[];
            setRouteCoordinates(coords.map((c: any) => ({ lat: Number(c.lat), lng: Number(c.lng) })));
          }
        }

        // Load latest tracking points for each participant
        const { data: trackingPoints } = await supabase
          .from('live_tracking_points')
          .select('user_id, lat, lng, recorded_at')
          .eq('session_id', sessionId)
          .order('recorded_at', { ascending: false });

        if (trackingPoints) {
          const latestByUser = new Map<string, { lat: number; lng: number }>();
          for (const pt of trackingPoints) {
            if (!latestByUser.has(pt.user_id)) {
              latestByUser.set(pt.user_id, { lat: Number(pt.lat), lng: Number(pt.lng) });
            }
          }
          const posMap = new Map<string, ParticipantPosition>();
          latestByUser.forEach((pos, uid) => {
            const profile = participantIds.includes(uid) ? undefined : undefined;
            posMap.set(uid, { ...pos, avatar_url: null, username: null, display_name: null });
          });
          setParticipantPositions(posMap);
        }
      } catch (err: any) {
        console.error('Error loading session tracking:', err);
        setError(err.message || 'Erreur de chargement');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [sessionId, user]);

  // Start GPS watching and send position every 5s
  useEffect(() => {
    if (!sessionId || !user || loading) return;

    const startWatching = async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          const id = await Geolocation.watchPosition(
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
            (pos) => {
              if (pos) {
                const coord = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setUserPosition(coord);
                lastSentRef.current = coord;
              }
            }
          );
          watchIdRef.current = id;
        } else if (navigator.geolocation) {
          const id = navigator.geolocation.watchPosition(
            (pos) => {
              const coord = { lat: pos.coords.latitude, lng: pos.coords.longitude };
              setUserPosition(coord);
              lastSentRef.current = coord;
            },
            () => {},
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
          );
          watchIdRef.current = id;
        }
      } catch (err) {
        console.error('GPS watch error:', err);
      }
    };

    startWatching();

    // Send position every 5 seconds
    sendIntervalRef.current = setInterval(async () => {
      if (!lastSentRef.current || !user) return;
      try {
        await supabase.from('live_tracking_points').insert({
          session_id: sessionId,
          user_id: user.id,
          lat: lastSentRef.current.lat,
          lng: lastSentRef.current.lng,
        });
      } catch (err) {
        console.error('Failed to send tracking point:', err);
      }
    }, 5000);

    return () => {
      if (watchIdRef.current !== null) {
        if (Capacitor.isNativePlatform()) {
          Geolocation.clearWatch({ id: watchIdRef.current as string });
        } else {
          navigator.geolocation.clearWatch(watchIdRef.current as number);
        }
        watchIdRef.current = null;
      }
      if (sendIntervalRef.current) {
        clearInterval(sendIntervalRef.current);
        sendIntervalRef.current = null;
      }
    };
  }, [sessionId, user, loading]);

  // Subscribe to realtime tracking updates
  useEffect(() => {
    if (!sessionId || !user) return;

    const channel = supabase
      .channel(`tracking-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_tracking_points',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const { user_id, lat, lng } = payload.new as any;
          if (user_id === user.id) return; // Skip own position

          setParticipantPositions(prev => {
            const next = new Map(prev);
            const profile = participantProfiles.get(user_id);
            next.set(user_id, {
              lat: Number(lat),
              lng: Number(lng),
              avatar_url: profile?.avatar_url || null,
              username: profile?.username || null,
              display_name: profile?.display_name || null,
            });
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, user, participantProfiles]);

  return {
    session,
    routeCoordinates,
    participantPositions,
    participantProfiles,
    userPosition,
    loading,
    error,
  };
}
