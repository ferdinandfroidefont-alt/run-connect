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
    const instagramClientId = Deno.env.get('INSTAGRAM_CLIENT_ID')
    if (!instagramClientId) {
      throw new Error('Instagram client ID not configured')
    }

    // Generate Instagram OAuth URL
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/instagram-callback`
    const scope = 'user_profile,user_media'
    const state = auth.user.id // Use user ID as state for security

    const authUrl = `https://api.instagram.com/oauth/authorize` +
      `?client_id=${instagramClientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${scope}` +
      `&response_type=code` +
      `&state=${state}`

    console.log('Generated Instagram auth URL for user:', auth.user.id)

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
    logException("instagram-connect", error);
    return new Response(
      JSON.stringify({ error: "instagram_connect_failed" }),
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