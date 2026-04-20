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
    // First, get the current profile to retrieve Strava tokens
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('strava_access_token')
      .eq('user_id', auth.user.id)
      .single()

    if (profileError) {
      logDbError("strava-disconnect", profileError);
      throw profileError
    }

    // If we have a Strava access token, revoke it with Strava API
    if (profile?.strava_access_token) {
      try {
        const revokeResponse = await fetch('https://www.strava.com/oauth/deauthorize', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${profile.strava_access_token}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        })
        
        if (!revokeResponse.ok) {
          console.warn('[strava-disconnect] strava_revoke_failed_continuing')
        } else {
          logStructured("strava-disconnect", "strava_revoked", {});
        }
      } catch {
        console.warn('[strava-disconnect] strava_revoke_exception_continuing')
      }
    }

    // Update user profile to disconnect Strava
    const { error } = await supabaseClient
      .from('profiles')
      .update({
        strava_connected: false,
        strava_verified_at: null,
        strava_user_id: null,
        strava_access_token: null,
        strava_refresh_token: null,
      })
      .eq('user_id', auth.user.id)

    if (error) {
      logDbError("strava-disconnect-update", error);
      throw error
    }

    logStructured("strava-disconnect", "done", { user: logUserRef(auth.user.id) });

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
    logException("strava-disconnect", error);
    return new Response(
      JSON.stringify({ error: "strava_disconnect_failed" }),
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