import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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

    console.log(`[award-organizer-points] Processing session: ${sessionId}`);

    const { data: validatedParticipants, error: countError } = await supabaseClient
      .from('session_participants')
      .select('user_id')
      .eq('session_id', sessionId)
      .eq('confirmed_by_creator', true);

    if (countError) {
      console.error('[award-organizer-points] Error counting participants:', countError);
      throw countError;
    }

    const validatedCount = validatedParticipants?.length || 0;
    console.log(`[award-organizer-points] Validated participants: ${validatedCount}`);

    const { data: session, error: sessionError } = await supabaseClient
      .from('sessions')
      .select('organizer_id')
      .eq('id', sessionId)
      .single();

    if (sessionError) {
      console.error('[award-organizer-points] Error fetching session:', sessionError);
      throw sessionError;
    }

    let totalPoints = 0;

    if (validatedCount >= 2) {
      totalPoints += 10;
    }

    totalPoints += validatedCount;

    if (totalPoints > 0) {
      console.log(`[award-organizer-points] Awarding ${totalPoints} points to organizer ${session.organizer_id}`);
      
      const { error: pointsError } = await supabaseClient
        .rpc('add_user_points', {
          user_id_param: session.organizer_id,
          points_to_add: totalPoints
        });

      if (pointsError) {
        console.error('[award-organizer-points] Error awarding points:', pointsError);
        throw pointsError;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        points_awarded: totalPoints,
        validated_count: validatedCount 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('[award-organizer-points] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
