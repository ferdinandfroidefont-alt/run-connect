import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Reset streaks for users who had no activity last week
    // This runs every Monday
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
      JSON.stringify({
        success: true,
        reset_count: resetData?.length || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
