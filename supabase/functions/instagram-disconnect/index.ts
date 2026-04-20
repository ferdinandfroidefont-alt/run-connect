import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireUserJwtCors } from "../_shared/auth.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logDbError, logException, logStructured, logUserRef } from "../_shared/secureLog.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const auth = await requireUserJwtCors(req, supabaseClient, corsHeaders);
  if (auth instanceof Response) return auth;

  try {
    // First, get the current profile to retrieve Instagram tokens
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('instagram_access_token')
      .eq('user_id', auth.user.id)
      .single()

    if (profileError) {
      logDbError("instagram-disconnect", profileError);
      throw profileError
    }

    // If we have an Instagram access token, we could revoke it with Instagram API
    // However, Instagram doesn't provide a simple revoke endpoint like Strava
    // So we'll just clear our local data
    if (profile?.instagram_access_token) {
      logStructured("instagram-disconnect", "clear_token", { user: logUserRef(auth.user.id) });
    }

    // Update user profile to disconnect Instagram
    const { error } = await supabaseClient
      .from('profiles')
      .update({
        instagram_connected: false,
        instagram_verified_at: null,
        instagram_user_id: null,
        instagram_access_token: null,
        instagram_username: null,
      })
      .eq('user_id', auth.user.id)

    if (error) {
      logDbError("instagram-disconnect-update", error);
      throw error
    }

    logStructured("instagram-disconnect", "done", { user: logUserRef(auth.user.id) });

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    logException("instagram-disconnect", error);
    return new Response(
      JSON.stringify({ error: "instagram_disconnect_failed" }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})