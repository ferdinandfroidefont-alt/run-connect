import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireUserJwtCors } from "../_shared/auth.ts";

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const auth = await requireUserJwtCors(req, supabaseAdmin, corsHeaders);
  if (auth instanceof Response) return auth;

  try {
    const { session_id, reward_satisfied } = await req.json();
    if (!session_id || reward_satisfied !== true) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: session, error } = await supabaseAdmin
      .from("sessions")
      .select("id, organizer_id, title, scheduled_at, location_lat, location_lng, visibility_tier, boost_expires_at, boost_consumed_at, boost_notification_sent_at")
      .eq("id", session_id)
      .single();

    if (error || !session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (session.organizer_id !== auth.user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (session.visibility_tier === "premium") {
      return new Response(JSON.stringify({ error: "Premium sessions do not need boost" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (session.boost_consumed_at) {
      return new Response(JSON.stringify({ error: "Boost already used" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (session.boost_expires_at && new Date(session.boost_expires_at).getTime() > Date.now()) {
      return new Response(JSON.stringify({ error: "Boost already active" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const scheduledAt = new Date(session.scheduled_at).getTime();
    if (scheduledAt <= Date.now()) {
      return new Response(JSON.stringify({ error: "Past session cannot be boosted" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const boostExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const { error: updateError } = await supabaseAdmin
      .from("sessions")
      .update({
        visibility_tier: "boost",
        visibility_radius_km: 25,
        boost_expires_at: boostExpiresAt,
        boost_consumed_at: new Date().toISOString(),
        boost_notification_sent_at: null,
        discovery_score: 1000,
      })
      .eq("id", session_id);

    if (updateError) throw updateError;

    const msUntilSession = scheduledAt - Date.now();
    const shouldNotifyNearby =
      !session.boost_notification_sent_at &&
      msUntilSession > 0 &&
      msUntilSession <= 3 * 60 * 60 * 1000 &&
      typeof session.location_lat === "number" &&
      typeof session.location_lng === "number";

    let notifiedCount = 0;

    if (shouldNotifyNearby) {
      const { data: nearbyProfiles } = await supabaseAdmin
        .from("profiles")
        .select("user_id, last_known_lat, last_known_lng, notifications_enabled, notif_friend_session")
        .not("last_known_lat", "is", null)
        .not("last_known_lng", "is", null)
        .neq("user_id", auth.user.id);

      const targets = (nearbyProfiles || [])
        .filter((p) => p.notifications_enabled !== false && p.notif_friend_session !== false)
        .map((p) => {
          const distanceKm = haversineKm(
            Number(session.location_lat),
            Number(session.location_lng),
            Number(p.last_known_lat),
            Number(p.last_known_lng),
          );
          return { user_id: p.user_id, distanceKm };
        })
        .filter((p) => p.distanceKm <= 15)
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, 50);

      for (const target of targets) {
        const { error: pushError } = await supabaseAdmin.functions.invoke("send-push-notification", {
          body: {
            user_id: target.user_id,
            title: "🔥 Une séance vient d’être lancée près de toi",
            body: "Rejoins-la maintenant",
            type: "friend_session",
            data: {
              session_id: session.id,
              session_title: session.title,
              boosted: true,
            },
          },
        });
        if (!pushError) notifiedCount++;
      }

      await supabaseAdmin
        .from("sessions")
        .update({ boost_notification_sent_at: new Date().toISOString() })
        .eq("id", session_id);
    }

    return new Response(JSON.stringify({ success: true, boost_expires_at: boostExpiresAt, notified_count: notifiedCount }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
