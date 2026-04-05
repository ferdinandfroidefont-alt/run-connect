import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireUserJwtCors } from "../_shared/auth.ts";

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
      .select("id, organizer_id, scheduled_at, visibility_tier, boost_expires_at, boost_consumed_at")
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
        discovery_score: 1000,
      })
      .eq("id", session_id);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ success: true, boost_expires_at: boostExpiresAt }), {
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
