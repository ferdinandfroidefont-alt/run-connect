import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { referralCode, newUserId } = await req.json();

    if (!referralCode || !newUserId) {
      return new Response(
        JSON.stringify({ error: 'Missing referral code or user ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Processing referral signup:', { referralCode, newUserId });

    // Trouver le lien de parrainage et l'utilisateur référent
    const { data: referralLink, error: linkError } = await supabase
      .from('referral_links')
      .select('user_id')
      .eq('unique_code', referralCode)
      .single();

    if (linkError || !referralLink) {
      console.error('Referral link not found:', linkError);
      return new Response(
        JSON.stringify({ error: 'Invalid referral code' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Créer l'entrée de parrainage
    const { error: referralError } = await supabase
      .from('referrals')
      .insert({
        referrer_id: referralLink.user_id,
        referred_id: newUserId,
        referral_code: referralCode
      });

    if (referralError) {
      console.error('Error creating referral:', referralError);
      return new Response(
        JSON.stringify({ error: 'Failed to create referral' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Referral created successfully');

    // Valider le défi de parrainage pour le référent
    const { error: challengeError } = await supabase.rpc('increment_challenge_progress', {
      p_user_id: referralLink.user_id,
      p_validation_type: 'refer_friend',
      p_increment: 1
    });

    if (challengeError) {
      console.error('Error validating challenge:', challengeError);
    }

    return new Response(
      JSON.stringify({ success: true, referrerId: referralLink.user_id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in process-referral-signup:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
