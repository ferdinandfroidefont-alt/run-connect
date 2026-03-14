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

    const lastWeekStart = new Date();
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekStartDate = lastWeekStart.toISOString().split("T")[0];

    const { data: resetData, error } = await supabase
      .from("user_stats")
      .update({ streak_weeks: 0, updated_at: new Date().toISOString() })
      .lt("last_streak_update", lastWeekStartDate)
      .gt("streak_weeks", 0)
      .select("id");

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, reset_count: resetData?.length || 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
