import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { pathLengthMeters, type MapCoord } from "@/lib/geoUtils";

export type CompletedActivityTab = "mine" | "public";

export type SessionRecord = {
  id: string;
  title: string;
  description: string | null;
  activity_type: string;
  session_type: string;
  intensity: string;
  location_name: string;
  location_lat: number;
  location_lng: number;
  scheduled_at: string;
  max_participants: number | null;
  current_participants: number | null;
  organizer_id: string;
  distance_km: number | null;
  image_url?: string | null;
};

export type CompletedActivityItem = {
  session: SessionRecord;
  trackCoords: MapCoord[];
  /** Distance parcourue (GPS) en m, ou null si indisponible */
  distanceM: number | null;
  durationSec: number | null;
  /** min/km course/marche ; null si non pertinent ou inconnu */
  paceMinPerKm: number | null;
  /** km/h vélo ; null si non pertinent ou inconnu */
  speedKmh: number | null;
  /** Activité personnelle : organisateur ou participant */
  role: "organizer" | "participant";
  /** Pour onglet public : profil organisateur */
  organizer?: { username: string; display_name: string | null; avatar_url: string | null };
};

function isCyclingLike(activity: string) {
  return activity === "cycling" || activity === "mtb" || activity === "vélo" || activity === "velo";
}

function statsFromTrack(coords: MapCoord[], times: string[]): Pick<CompletedActivityItem, "distanceM" | "durationSec" | "paceMinPerKm" | "speedKmh"> {
  if (coords.length < 2) {
    return { distanceM: null, durationSec: null, paceMinPerKm: null, speedKmh: null };
  }
  const distanceM = pathLengthMeters(coords);
  if (times.length < 2) {
    return { distanceM, durationSec: null, paceMinPerKm: null, speedKmh: null };
  }
  const t0 = new Date(times[0]!).getTime();
  const t1 = new Date(times[times.length - 1]!).getTime();
  const durationSec = Math.max(1, Math.round((t1 - t0) / 1000));
  const km = distanceM / 1000;
  if (km < 0.05) {
    return { distanceM, durationSec, paceMinPerKm: null, speedKmh: null };
  }
  const paceMinPerKm = durationSec / 60 / km;
  const speedKmh = km / (durationSec / 3600);
  return { distanceM, durationSec, paceMinPerKm, speedKmh };
}

function mergeStats(
  track: ReturnType<typeof statsFromTrack>,
  sessionDistanceKm: number | null,
  activity_type: string
): Pick<CompletedActivityItem, "distanceM" | "durationSec" | "paceMinPerKm" | "speedKmh"> {
  let distanceM = track.distanceM;
  if (distanceM == null && sessionDistanceKm != null && sessionDistanceKm > 0) {
    distanceM = sessionDistanceKm * 1000;
  }
  const cycling = isCyclingLike(activity_type);
  let paceMinPerKm = track.paceMinPerKm;
  let speedKmh = track.speedKmh;
  let durationSec = track.durationSec;

  if (cycling) {
    paceMinPerKm = null;
    if (distanceM != null && durationSec != null && durationSec > 0) {
      speedKmh = distanceM / 1000 / (durationSec / 3600);
    }
  } else {
    speedKmh = null;
    if (distanceM != null && durationSec != null && durationSec > 0) {
      paceMinPerKm = durationSec / 60 / (distanceM / 1000);
    }
  }

  return { distanceM, durationSec, paceMinPerKm, speedKmh };
}

async function fetchProfiles(userIds: string[]) {
  const uniq = [...new Set(userIds)].filter(Boolean);
  if (uniq.length === 0) return new Map<string, { username: string; display_name: string | null; avatar_url: string | null }>();
  const { data } = await supabase.from("profiles").select("user_id, username, display_name, avatar_url").in("user_id", uniq);
  const m = new Map<string, { username: string; display_name: string | null; avatar_url: string | null }>();
  data?.forEach((p) => {
    if (p.user_id) m.set(p.user_id, { username: p.username || "", display_name: p.display_name, avatar_url: p.avatar_url });
  });
  return m;
}

export function useCompletedActivities(tab: CompletedActivityTab, enabled = true) {
  const { user } = useAuth();
  const [items, setItems] = useState<CompletedActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const fetchGen = useRef(0);

  const load = useCallback(async () => {
    if (!enabled) {
      setItems([]);
      setLoading(false);
      return;
    }
    if (!user?.id) {
      setItems([]);
      setLoading(false);
      return;
    }
    const gen = ++fetchGen.current;
    const nowIso = new Date().toISOString();
    setLoading(true);
    try {
      let sessions: SessionRecord[] = [];

      if (tab === "mine") {
        const [{ data: created }, { data: partRows }] = await Promise.all([
          supabase.from("sessions").select("*").eq("organizer_id", user.id).lt("scheduled_at", nowIso),
          supabase.from("session_participants").select("session_id").eq("user_id", user.id),
        ]);
        const partIds = [...new Set((partRows || []).map((r) => r.session_id))];
        const { data: joined } =
          partIds.length > 0
            ? await supabase.from("sessions").select("*").in("id", partIds).lt("scheduled_at", nowIso)
            : { data: [] as SessionRecord[] };

        const byId = new Map<string, SessionRecord>();
        (created || []).forEach((s) => byId.set(s.id, s as SessionRecord));
        (joined || []).forEach((s) => byId.set(s.id, s as SessionRecord));
        sessions = Array.from(byId.values()).sort(
          (a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()
        );

        const sessionIds = sessions.map((s) => s.id);
        if (sessionIds.length === 0) {
          if (gen === fetchGen.current) setItems([]);
          return;
        }
        const { data: points } = await supabase
          .from("live_tracking_points")
          .select("session_id, lat, lng, recorded_at")
          .eq("user_id", user.id)
          .in("session_id", sessionIds)
          .order("recorded_at", { ascending: true });

        const bySession = new Map<string, { coords: MapCoord[]; times: string[] }>();
        for (const p of points || []) {
          const sid = p.session_id;
          if (!bySession.has(sid)) bySession.set(sid, { coords: [], times: [] });
          const g = bySession.get(sid)!;
          g.coords.push({ lat: Number(p.lat), lng: Number(p.lng) });
          g.times.push(p.recorded_at);
        }

        const out: CompletedActivityItem[] = sessions.map((session) => {
          const g = bySession.get(session.id);
          const coords = g?.coords || [];
          const times = g?.times || [];
          const raw = statsFromTrack(coords, times);
          const { distanceM, durationSec, paceMinPerKm, speedKmh } = mergeStats(raw, session.distance_km, session.activity_type);
          const role: "organizer" | "participant" = session.organizer_id === user.id ? "organizer" : "participant";
          return { session, trackCoords: coords, distanceM, durationSec, paceMinPerKm, speedKmh, role };
        });
        if (gen === fetchGen.current) setItems(out);
      } else {
        const { data: pub } = await supabase
          .from("sessions")
          .select("*")
          .lt("scheduled_at", nowIso)
          .eq("friends_only", false)
          .is("club_id", null)
          .neq("organizer_id", user.id)
          .order("scheduled_at", { ascending: false })
          .limit(80);

        sessions = (pub || [])
          .filter((s: { is_private?: boolean | null }) => s.is_private !== true)
          .slice(0, 40) as SessionRecord[];

        if (sessions.length === 0) {
          if (gen === fetchGen.current) setItems([]);
          return;
        }

        const sessionIds = sessions.map((s) => s.id);
        const orgIds = sessions.map((s) => s.organizer_id);

        const [{ data: points }, profileMap] = await Promise.all([
          supabase
            .from("live_tracking_points")
            .select("session_id, user_id, lat, lng, recorded_at")
            .in("session_id", sessionIds)
            .in("user_id", orgIds)
            .order("recorded_at", { ascending: true }),
          fetchProfiles(orgIds),
        ]);

        const bySession = new Map<string, { coords: MapCoord[]; times: string[] }>();
        const orgBySession = new Map(sessions.map((s) => [s.id, s.organizer_id] as const));
        for (const p of points || []) {
          if (p.user_id !== orgBySession.get(p.session_id)) continue;
          const sid = p.session_id;
          if (!bySession.has(sid)) bySession.set(sid, { coords: [], times: [] });
          const g = bySession.get(sid)!;
          g.coords.push({ lat: Number(p.lat), lng: Number(p.lng) });
          g.times.push(p.recorded_at);
        }

        const out: CompletedActivityItem[] = sessions.map((session) => {
          const g = bySession.get(session.id);
          const coords = g?.coords || [];
          const times = g?.times || [];
          const raw = statsFromTrack(coords, times);
          const { distanceM, durationSec, paceMinPerKm, speedKmh } = mergeStats(raw, session.distance_km, session.activity_type);
          const op = profileMap.get(session.organizer_id);
          return {
            session,
            trackCoords: coords,
            distanceM,
            durationSec,
            paceMinPerKm,
            speedKmh,
            role: "participant",
            organizer: op
              ? { username: op.username, display_name: op.display_name, avatar_url: op.avatar_url }
              : undefined,
          };
        });
        if (gen === fetchGen.current) setItems(out);
      }
    } catch (e) {
      console.error("useCompletedActivities:", e);
      if (gen === fetchGen.current) setItems([]);
    } finally {
      if (gen === fetchGen.current) setLoading(false);
    }
  }, [user?.id, tab, enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  return { items, loading, refresh: load };
}
