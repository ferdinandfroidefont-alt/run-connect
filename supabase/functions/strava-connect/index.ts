import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireUserJwtCors } from "../_shared/auth.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logException, logStructured, logUserRef } from "../_shared/secureLog.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const auth = await requireUserJwtCors(req, supabaseAdmin, corsHeaders);
  if (auth instanceof Response) return auth;

  try {
    const stravaClientId = Deno.env.get('STRAVA_CLIENT_ID')
    if (!stravaClientId) {
      throw new Error('Strava client ID not configured')
    }

    // Generate Strava OAuth URL
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/strava-callback`
    const scope = 'read,activity:read_all'
    const state = auth.user.id // Use user ID as state for security

    const authUrl = `https://www.strava.com/oauth/authorize` +
      `?client_id=${stravaClientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${scope}` +
      `&state=${state}`

    console.log('Generated Strava auth URL for user:', auth.user.id)

    return new Response(
      JSON.stringify({ authUrl }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    logException("strava-connect", error);
    return new Response(
      JSON.stringify({ error: "strava_connect_failed" }),
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