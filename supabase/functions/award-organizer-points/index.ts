import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireCron } from "../_shared/auth.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Verify cron secret for internal calls
  if (!requireCron(req)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { sessionId } = await req.json();

    if (!sessionId) {
      throw new Error('sessionId is required');
    }

    const { data: validatedParticipants, error: countError } = await supabaseClient
      .from('session_participants')
      .select('user_id')
      .eq('session_id', sessionId)
      .eq('confirmed_by_creator', true);

    if (countError) throw countError;

    const validatedCount = validatedParticipants?.length || 0;

    const { data: session, error: sessionError } = await supabaseClient
      .from('sessions')
      .select('organizer_id')
      .eq('id', sessionId)
      .single();

    if (sessionError) throw sessionError;

    let totalPoints = 0;
    if (validatedCount >= 2) totalPoints += 10;
    totalPoints += validatedCount;

    if (totalPoints > 0) {
      const { error: pointsError } = await supabaseClient
        .rpc('add_user_points', {
          user_id_param: session.organizer_id,
          points_to_add: totalPoints
        });

      if (pointsError) throw pointsError;
    }

    return new Response(
      JSON.stringify({ success: true, points_awarded: totalPoints, validated_count: validatedCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
