import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, token, platform } = await req.json();

    // Validate inputs
    if (!user_id || !UUID_REGEX.test(user_id)) {
      return new Response(
        JSON.stringify({ error: 'user_id invalide (UUID requis)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!token || typeof token !== 'string' || token.length < 50) {
      return new Response(
        JSON.stringify({ error: 'token invalide (>50 caractères requis)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Block raw APNs tokens (hex 64 chars) — these are NOT valid FCM tokens
    const APNS_HEX_REGEX = /^[A-Fa-f0-9]{64}$/;
    if (platform === 'ios' && APNS_HEX_REGEX.test(token)) {
      console.error('❌ [SAVE-TOKEN] Rejected raw APNs token (hex-64) for iOS — FCM token required');
      return new Response(
        JSON.stringify({ error: 'ios_apns_token_not_fcm', message: 'Ce token est un token APNs brut, pas un token FCM. Redémarrez l\'app.' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error } = await supabase
      .from('profiles')
      .update({
        push_token: token,
        push_token_platform: platform || 'android',
        push_token_updated_at: new Date().toISOString(),
        notifications_enabled: true
      })
      .eq('user_id', user_id);

    if (error) {
      console.error('❌ [SAVE-TOKEN] DB error:', error);
      return new Response(
        JSON.stringify({ error: 'Erreur sauvegarde', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ [SAVE-TOKEN] Token saved for user:', user_id.substring(0, 8) + '...');

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('❌ [SAVE-TOKEN] Exception:', e);
    return new Response(
      JSON.stringify({ error: 'Erreur serveur', details: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
