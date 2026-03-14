import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, verifyCronSecret } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!verifyCronSecret(req)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: activeSessions } = await supabase
      .from("sessions")
      .select("id, live_tracking_started_at, live_tracking_max_duration")
      .eq("live_tracking_active", true)
      .not("live_tracking_started_at", "is", null);

    let stoppedCount = 0;
    for (const session of activeSessions || []) {
      const startedAt = new Date(session.live_tracking_started_at).getTime();
      const maxMs = (session.live_tracking_max_duration || 120) * 60 * 1000;
      if (Date.now() - startedAt > maxMs) {
        await supabase.from("sessions").update({ live_tracking_active: false }).eq("id", session.id);
        stoppedCount++;
      }
    }

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: deletedCount } = await supabase.from("live_tracking_points").delete().lt("recorded_at", oneDayAgo);

    return new Response(
      JSON.stringify({ success: true, stopped_sessions: stoppedCount, deleted_points: deletedCount || 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
