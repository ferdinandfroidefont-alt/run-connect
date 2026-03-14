import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders, verifyCronSecret } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!verifyCronSecret(req)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: activeChallenges, error: challengesError } = await supabase
      .from('user_challenges')
      .select(`user_id, progress, target, challenge:challenges(reward_points)`)
      .eq('status', 'active')
      .lt('progress', supabase.rpc('target'));

    if (challengesError) throw challengesError;

    const userChallengesMap = new Map<string, any[]>();
    activeChallenges?.forEach(challenge => {
      if (!userChallengesMap.has(challenge.user_id)) {
        userChallengesMap.set(challenge.user_id, []);
      }
      userChallengesMap.get(challenge.user_id)!.push(challenge);
    });

    let sentCount = 0;
    let errorCount = 0;

    for (const [userId, challenges] of userChallengesMap.entries()) {
      const activeChallengesCount = challenges.length;
      const totalPoints = challenges.reduce((sum, c) => sum + (c.challenge?.reward_points || 0), 0);

      const title = "⏰ Dernier jour !";
      const body = activeChallengesCount === 1
        ? `Il te reste 1 défi à terminer avant lundi. ${totalPoints} points à gagner !`
        : `Il te reste ${activeChallengesCount} défis à terminer avant lundi. ${totalPoints} points à gagner !`;

      try {
        const { error: pushError } = await supabase.functions.invoke('send-push-notification', {
          body: { user_id: userId, title, body, type: 'challenge_reminder', data: { active_challenges: activeChallengesCount, total_points: totalPoints } }
        });

        if (pushError) errorCount++;
        else sentCount++;
      } catch {
        errorCount++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, errors: errorCount, total_users: userChallengesMap.size }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
