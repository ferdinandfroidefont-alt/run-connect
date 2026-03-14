import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from "../_shared/cors.ts";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const APNS_HEX_REGEX = /^[A-Fa-f0-9]{64}$/;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const traceId = req.headers.get('x-push-trace-id') || 'no-trace';

  try {
    const { user_id, token, platform, trace_id: bodyTraceId } = await req.json();
    const effectiveTraceId = traceId !== 'no-trace' ? traceId : (bodyTraceId || 'no-trace');

    console.log(`[SAVE-TOKEN][ENTRY] traceId=${effectiveTraceId} user=${user_id?.substring(0, 8)}... platform=${platform} token_length=${token?.length}`);

    // Validate inputs
    if (!user_id || !UUID_REGEX.test(user_id)) {
      console.error(`[SAVE-TOKEN][VALIDATE] Invalid user_id traceId=${effectiveTraceId}`);
      return new Response(
        JSON.stringify({ error: 'user_id invalide (UUID requis)', trace_id: effectiveTraceId }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!token || typeof token !== 'string' || token.length < 50) {
      console.error(`[SAVE-TOKEN][VALIDATE] Invalid token length=${token?.length} traceId=${effectiveTraceId}`);
      return new Response(
        JSON.stringify({ error: 'token invalide (>50 caractères requis)', trace_id: effectiveTraceId }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Block raw APNs tokens (hex 64 chars)
    if (platform === 'ios' && APNS_HEX_REGEX.test(token)) {
      console.error(`[SAVE-TOKEN][REJECT] Raw APNs hex-64 token rejected traceId=${effectiveTraceId}`);
      return new Response(
        JSON.stringify({ error: 'ios_apns_token_not_fcm', message: 'Token APNs brut rejeté, FCM requis.', trace_id: effectiveTraceId }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify JWT if present
    const authHeader = req.headers.get('Authorization');
    let jwtUserId: string | null = null;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error(`[SAVE-TOKEN][AUTH] Missing Authorization header traceId=${effectiveTraceId}`);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: JWT required', trace_id: effectiveTraceId }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jwtToken = authHeader.replace('Bearer ', '');
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(jwtToken);
    if (authError || !userData?.user) {
      console.error(`[SAVE-TOKEN][AUTH] JWT validation failed: ${authError?.message} traceId=${effectiveTraceId}`);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: invalid JWT', trace_id: effectiveTraceId }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    jwtUserId = userData.user.id;

    if (jwtUserId !== user_id) {
      console.error(`[SAVE-TOKEN][AUTH] user_id mismatch traceId=${effectiveTraceId}`);
      return new Response(
        JSON.stringify({ error: 'user_id mismatch with JWT', trace_id: effectiveTraceId }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role for the actual update
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update({
        push_token: token,
        push_token_platform: platform || 'android',
        push_token_updated_at: new Date().toISOString(),
        notifications_enabled: true
      })
      .eq('user_id', user_id)
      .select('user_id, push_token')
      .maybeSingle();

    if (error) {
      console.error(`[SAVE-TOKEN][UPDATE] DB error: ${error.message} traceId=${effectiveTraceId}`);
      return new Response(
        JSON.stringify({ error: 'Erreur sauvegarde', details: error.message, trace_id: effectiveTraceId }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!updatedProfile) {
      console.error(`[SAVE-TOKEN][UPDATE] No profile found for user_id=${user_id?.substring(0, 8)}... traceId=${effectiveTraceId}`);
      return new Response(
        JSON.stringify({ error: 'profile_not_found_or_not_updated', trace_id: effectiveTraceId }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[SAVE-TOKEN][SUCCESS] updated=true user=${updatedProfile.user_id?.substring(0, 8)}... token_length=${updatedProfile.push_token?.length} traceId=${effectiveTraceId}`);

    return new Response(
      JSON.stringify({
        success: true,
        trace_id: effectiveTraceId,
        updated: true,
        token_length: updatedProfile.push_token?.length,
        platform: platform || 'android',
        user_id_prefix: user_id?.substring(0, 8),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error(`[SAVE-TOKEN][EXCEPTION] ${e} traceId=${traceId}`);
    return new Response(
      JSON.stringify({ error: 'Erreur serveur', details: String(e), trace_id: traceId }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
