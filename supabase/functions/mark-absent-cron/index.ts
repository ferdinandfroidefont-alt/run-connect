import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    console.log('[mark-absent-cron] Starting cron job');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error } = await supabaseClient.rpc('mark_absent_participants');

    if (error) {
      console.error('[mark-absent-cron] Error:', error);
      throw error;
    }

    console.log('[mark-absent-cron] Successfully marked absent participants');

    return new Response(
      JSON.stringify({ success: true, message: 'Absences détectées et pénalisées' }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('[mark-absent-cron] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
