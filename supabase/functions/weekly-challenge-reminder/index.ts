import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('⏰ [WEEKLY_REMINDER] Exécution du rappel dimanche soir');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Récupérer tous les utilisateurs avec des défis actifs non complétés
    const { data: activeChallenges, error: challengesError } = await supabase
      .from('user_challenges')
      .select(`
        user_id,
        progress,
        target,
        challenge:challenges(reward_points)
      `)
      .eq('status', 'active')
      .lt('progress', supabase.rpc('target')); // progress < target

    if (challengesError) {
      console.error('❌ Erreur récupération défis actifs:', challengesError);
      throw challengesError;
    }

    console.log(`📊 ${activeChallenges?.length || 0} défis actifs trouvés`);

    // Grouper par user_id
    const userChallengesMap = new Map<string, any[]>();
    activeChallenges?.forEach(challenge => {
      if (!userChallengesMap.has(challenge.user_id)) {
        userChallengesMap.set(challenge.user_id, []);
      }
      userChallengesMap.get(challenge.user_id)!.push(challenge);
    });

    let sentCount = 0;
    let errorCount = 0;

    // Envoyer une notification à chaque utilisateur
    for (const [userId, challenges] of userChallengesMap.entries()) {
      const activeChallengesCount = challenges.length;
      const totalPoints = challenges.reduce((sum, c) => 
        sum + (c.challenge?.reward_points || 0), 0
      );

      const title = "⏰ Dernier jour !";
      const body = activeChallengesCount === 1
        ? `Il te reste 1 défi à terminer avant lundi. ${totalPoints} points à gagner !`
        : `Il te reste ${activeChallengesCount} défis à terminer avant lundi. ${totalPoints} points à gagner !`;

      try {
        const { error: pushError } = await supabase.functions.invoke('send-push-notification', {
          body: {
            user_id: userId,
            title,
            body,
            type: 'challenge_reminder',
            data: {
              active_challenges: activeChallengesCount,
              total_points: totalPoints
            }
          }
        });

        if (pushError) {
          console.error(`❌ Erreur envoi push user ${userId}:`, pushError);
          errorCount++;
        } else {
          sentCount++;
        }
      } catch (err) {
        console.error(`❌ Exception envoi push user ${userId}:`, err);
        errorCount++;
      }
    }

    console.log(`✅ Rappels envoyés: ${sentCount} succès, ${errorCount} erreurs`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: sentCount, 
        errors: errorCount,
        total_users: userChallengesMap.size
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Exception générale:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
