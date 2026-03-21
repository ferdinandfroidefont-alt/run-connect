import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { getLiveShareOptIn, liveShareStorageKey } from '@/lib/liveTrackingStorage';
import { isWithinSessionLiveWindow } from '@/lib/geo';

export interface ParticipantPosition {
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

export interface SessionTrackingSession {
  id: string;
  title: string;
  location_lat: number;
  location_lng: number;
  route_id: string | null;
  organizer_id: string;
  live_tracking_active: boolean | null;
  live_tracking_enabled: boolean | null;
  scheduled_at: string;
  live_tracking_max_duration: number | null;
}

export function useSessionTracking(sessionId: string | undefined) {
  const { user } = useAuth();
  const [session, setSession] = useState<SessionTrackingSession | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<RouteCoord[]>([]);
  const [participantPositions, setParticipantPositions] = useState<Map<string, ParticipantPosition>>(new Map());
  const [participantProfiles, setParticipantProfiles] = useState<
    Map<string, { avatar_url: string | null; username: string | null; display_name: string | null }>
  >(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [sharingOptIn, setSharingOptIn] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const watchIdRef = useRef<string | number | null>(null);
  const sendIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSentRef = useRef<{ lat: number; lng: number } | null>(null);
  const profilesRef = useRef(participantProfiles);

  useEffect(() => {
    profilesRef.current = participantProfiles;
  }, [participantProfiles]);

  const maxDurationMin = session?.live_tracking_max_duration ?? 120;
  const inLiveWindow = useMemo(
    () =>
      session?.scheduled_at
        ? isWithinSessionLiveWindow(session.scheduled_at, maxDurationMin, nowTick)
        : false,
    [session?.scheduled_at, maxDurationMin, nowTick]
  );

  const sessionAllowsLive = session?.live_tracking_enabled === true;
  const shouldBroadcast =
    !!sessionId && !!user && sessionAllowsLive && inLiveWindow && sharingOptIn;

  // Fenêtre horaire : rafraîchir périodiquement pour couper l'envoi après la fin
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 20000);
    return () => clearInterval(t);
  }, []);

  // Opt-in (Mes séances) — même onglet + autres onglets
  useEffect(() => {
    if (!sessionId) return;
    const read = () => setSharingOptIn(getLiveShareOptIn(sessionId));
    read();
    const poll = setInterval(read, 2000);
    const onStorage = (e: StorageEvent) => {
      if (e.key === liveShareStorageKey(sessionId)) read();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      clearInterval(poll);
      window.removeEventListener('storage', onStorage);
    };
  }, [sessionId]);

  // Load session + participants + route + derniers points
  useEffect(() => {
    if (!sessionId || !user) return;

    const load = async () => {
      setLoading(true);
      try {
        const { data: sess, error: sessErr } = await supabase
          .from('sessions')
          .select(
            'id, title, location_lat, location_lng, route_id, organizer_id, live_tracking_active, live_tracking_enabled, scheduled_at, live_tracking_max_duration'
          )
          .eq('id', sessionId)
          .single();
        if (sessErr) throw sessErr;
        setSession(sess as SessionTrackingSession);

        const { data: participants } = await supabase
          .from('session_participants')
          .select('user_id')
          .eq('session_id', sessionId);

        const participantIds = participants?.map((p) => p.user_id) || [];
        if (!participantIds.includes(sess.organizer_id)) {
          participantIds.push(sess.organizer_id);
        }

        const profileMap = new Map<
          string,
          { avatar_url: string | null; username: string | null; display_name: string | null }
        >();
        if (participantIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, avatar_url, username, display_name')
            .in('user_id', participantIds);

          profiles?.forEach((p) => {
            if (p.user_id) {
              profileMap.set(p.user_id, {
                avatar_url: p.avatar_url,
                username: p.username,
                display_name: p.display_name,
              });
            }
          });
          setParticipantProfiles(profileMap);
        } else {
          setParticipantProfiles(profileMap);
        }

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
        } else {
          setRouteCoordinates([]);
        }

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
            const prof = profileMap.get(uid);
            posMap.set(uid, {
              ...pos,
              avatar_url: prof?.avatar_url ?? null,
              username: prof?.username ?? null,
              display_name: prof?.display_name ?? null,
            });
          });
          setParticipantPositions(posMap);
        } else {
          setParticipantPositions(new Map());
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

  // GPS : toujours pour afficher « ma position » sur la carte
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

    return () => {
      if (watchIdRef.current !== null) {
        if (Capacitor.isNativePlatform()) {
          Geolocation.clearWatch({ id: watchIdRef.current as string });
        } else {
          navigator.geolocation.clearWatch(watchIdRef.current as number);
        }
        watchIdRef.current = null;
      }
    };
  }, [sessionId, user, loading]);

  // Envoi des points : uniquement si séance autorise + créneau horaire + opt-in Mes séances
  useEffect(() => {
    if (!sessionId || !user || loading || !session) return;

    if (!shouldBroadcast) {
      if (sendIntervalRef.current) {
        clearInterval(sendIntervalRef.current);
        sendIntervalRef.current = null;
      }
      return;
    }

    const tick = async () => {
      if (!lastSentRef.current) return;
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
    };

    tick();
    sendIntervalRef.current = setInterval(tick, 5000);

    return () => {
      if (sendIntervalRef.current) {
        clearInterval(sendIntervalRef.current);
        sendIntervalRef.current = null;
      }
    };
  }, [sessionId, user, loading, session, shouldBroadcast]);

  // Realtime : positions des autres
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
          if (user_id === user.id) return;

          setParticipantPositions((prev) => {
            const next = new Map(prev);
            const profile = profilesRef.current.get(user_id);
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
  }, [sessionId, user]);

  return {
    session,
    routeCoordinates,
    participantPositions,
    participantProfiles,
    userPosition,
    loading,
    error,
    /** Partage autorisé par la séance (création) */
    sessionAllowsLive,
    /** Maintenant dans le créneau prévu (début → fin max) */
    inLiveWindow,
    /** Utilisateur a activé le partage dans Mes séances */
    sharingOptIn,
    /** Envoie réellement des points */
    isBroadcasting: shouldBroadcast,
  };
}
