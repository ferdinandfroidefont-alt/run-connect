import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  user_id: string;
  challenge_title: string;
  reward_points: number;
  progress?: number;
  target?: number;
  event_type: 'almost_done' | 'completed';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: NotificationPayload = await req.json();
    console.log('📱 [CHALLENGE_NOTIF] Payload reçu:', payload);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let title: string;
    let body: string;
    let type: string;

    if (payload.event_type === 'almost_done') {
      title = "🔥 Plus qu'une action !";
      body = `Tu es à un pas de terminer "${payload.challenge_title}" (+${payload.reward_points} pts)`;
      type = "challenge_almost_done";
    } else if (payload.event_type === 'completed') {
      title = "🎉 Défi complété !";
      body = `Bravo ! Tu as terminé "${payload.challenge_title}" et gagné ${payload.reward_points} points`;
      type = "challenge_completed";
    } else {
      throw new Error('event_type invalide');
    }

    console.log(`📤 Envoi notification: ${title}`);

    // Appeler l'edge function send-push-notification
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        user_id: payload.user_id,
        title,
        body,
        type,
        data: {
          challenge_title: payload.challenge_title,
          reward_points: payload.reward_points,
          event_type: payload.event_type
        }
      }
    });

    if (error) {
      console.error('❌ Erreur envoi push:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Notification envoyée:', data);

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Exception:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
