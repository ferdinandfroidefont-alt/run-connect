import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireUserJwtCors } from "../_shared/auth.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logDbError, logException, logHttpUpstream } from "../_shared/secureLog.ts";

type SessionRow = {
  id: string;
  organizer_id: string;
  scheduled_at: string;
  activity_type: string;
  location_lat: number | null;
  location_lng: number | null;
  distance_km: number | null;
};

type ParticipantRow = {
  id: string;
  user_id: string;
};

type ProfileRow = {
  user_id: string;
  strava_connected: boolean | null;
  strava_access_token: string | null;
};

type StravaActivity = {
  id: number;
  name: string;
  sport_type?: string;
  type?: string;
  start_date: string;
  distance: number;
  moving_time: number;
  map?: { summary_polyline?: string };
  start_latlng?: number[] | null;
};

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const r = 6371e3;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  return r * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function normalizeSport(value: string | null | undefined): string {
  const v = (value || "").toLowerCase();
  if (["run", "running"].includes(v)) return "run";
  if (["ride", "cycling", "mtb"].includes(v)) return "ride";
  if (["walk", "hike", "walking"].includes(v)) return "walk";
  if (["swim", "swimming"].includes(v)) return "swim";
  return v || "other";
}

function scoreCandidate(
  session: SessionRow,
  activity: StravaActivity,
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  const sessionAt = new Date(session.scheduled_at).getTime();
  const activityAt = new Date(activity.start_date).getTime();
  const hoursDiff = Math.abs(activityAt - sessionAt) / (1000 * 60 * 60);
  let score = 0;

  const sessionSport = normalizeSport(session.activity_type);
  const activitySport = normalizeSport(activity.sport_type || activity.type);
  if (sessionSport === activitySport) {
    score += 40;
    reasons.push("same_sport");
  } else if (sessionSport !== "other" && activitySport !== "other") {
    score += 10;
    reasons.push("related_sport");
  }

  if (hoursDiff <= 2) {
    score += 35;
    reasons.push("very_close_time");
  } else if (hoursDiff <= 8) {
    score += 24;
    reasons.push("close_time");
  } else if (hoursDiff <= 24) {
    score += 12;
    reasons.push("same_day");
  }

  if (session.distance_km && session.distance_km > 0 && activity.distance > 0) {
    const distKm = activity.distance / 1000;
    const ratio = distKm / session.distance_km;
    if (ratio >= 0.75 && ratio <= 1.35) {
      score += 18;
      reasons.push("distance_match");
    } else if (ratio >= 0.5 && ratio <= 1.8) {
      score += 10;
      reasons.push("distance_close");
    }
  }

  if (session.location_lat && session.location_lng && Array.isArray(activity.start_latlng) && activity.start_latlng.length >= 2) {
    const lat = Number(activity.start_latlng[0]);
    const lng = Number(activity.start_latlng[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const geoDist = haversineMeters(session.location_lat, session.location_lng, lat, lng);
      if (geoDist <= 1500) {
        score += 12;
        reasons.push("near_location");
      } else if (geoDist <= 5000) {
        score += 6;
        reasons.push("same_area");
      }
    }
  }

  return { score: Math.min(100, Math.max(0, Math.round(score))), reasons };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const auth = await requireUserJwtCors(req, supabase, corsHeaders);
  if (auth instanceof Response) return auth;

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
    if (!sessionId) {
      return new Response(JSON.stringify({ error: "sessionId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("id, organizer_id, scheduled_at, activity_type, location_lat, location_lng, distance_km")
      .eq("id", sessionId)
      .maybeSingle<SessionRow>();

    if (sessionError || !session) {
      logDbError("strava-session-candidates", sessionError);
      return new Response(JSON.stringify({ error: "session_not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (session.organizer_id !== auth.user.id) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: participants, error: participantsError } = await supabase
      .from("session_participants")
      .select("id, user_id")
      .eq("session_id", sessionId)
      .limit(60)
      .returns<ParticipantRow[]>();

    if (participantsError) {
      logDbError("strava-session-candidates", participantsError);
      return new Response(JSON.stringify({ error: "participants_fetch_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const participantIds = (participants || []).map((p) => p.user_id);
    if (!participantIds.length) {
      return new Response(JSON.stringify({ byParticipant: {} }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, strava_connected, strava_access_token")
      .in("user_id", participantIds)
      .returns<ProfileRow[]>();

    if (profilesError) {
      logDbError("strava-session-candidates", profilesError);
      return new Response(JSON.stringify({ error: "profiles_fetch_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const profileByUserId = new Map((profiles || []).map((p) => [p.user_id, p]));
    const afterSec = Math.floor(new Date(session.scheduled_at).getTime() / 1000) - 2 * 24 * 3600;
    const byParticipant: Record<string, unknown[]> = {};

    for (const participant of participants || []) {
      const profile = profileByUserId.get(participant.user_id);
      if (!profile?.strava_connected || !profile?.strava_access_token) {
        byParticipant[participant.id] = [];
        continue;
      }

      const res = await fetch(
        `https://www.strava.com/api/v3/athlete/activities?after=${afterSec}&per_page=25`,
        {
          headers: {
            Authorization: `Bearer ${profile.strava_access_token}`,
            Accept: "application/json",
          },
        },
      );

      if (!res.ok) {
        logHttpUpstream("strava-session-candidates", res.status, "activities");
        byParticipant[participant.id] = [];
        continue;
      }

      const activities = (await res.json().catch(() => [])) as StravaActivity[];
      const ranked = (activities || [])
        .map((a) => {
          const rankedScore = scoreCandidate(session, a);
          const speedMps = a.moving_time > 0 ? a.distance / a.moving_time : 0;
          const paceMinPerKm = speedMps > 0 ? 1000 / speedMps / 60 : 0;
          const paceOrSpeed = paceMinPerKm > 0 && paceMinPerKm < 99
            ? `${paceMinPerKm.toFixed(2)} min/km`
            : null;

          return {
            id: String(a.id),
            title: a.name || "Activité Strava",
            sportType: a.sport_type || a.type || "Workout",
            startDate: a.start_date,
            distanceKm: Number.isFinite(a.distance) ? Number((a.distance / 1000).toFixed(2)) : null,
            durationMin: Number.isFinite(a.moving_time) ? Math.round(a.moving_time / 60) : null,
            paceOrSpeed,
            compatibilityScore: rankedScore.score,
            matchReasons: rankedScore.reasons,
            startLat: Array.isArray(a.start_latlng) ? a.start_latlng[0] : null,
            startLng: Array.isArray(a.start_latlng) ? a.start_latlng[1] : null,
          };
        })
        .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
        .slice(0, 5)
        .map((item, idx) => ({ ...item, isTopMatch: idx === 0 }));

      byParticipant[participant.id] = ranked;
    }

    return new Response(JSON.stringify({ byParticipant }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    logException("strava-session-candidates", e);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
