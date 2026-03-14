import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role for admin operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get user from request
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: user } = await supabaseClient.auth.getUser(token)

    if (!user.user) {
      throw new Error('Not authenticated')
    }

    // First, get the current profile to retrieve Instagram tokens
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('instagram_access_token')
      .eq('user_id', user.user.id)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      throw profileError
    }

    // If we have an Instagram access token, we could revoke it with Instagram API
    // However, Instagram doesn't provide a simple revoke endpoint like Strava
    // So we'll just clear our local data
    if (profile?.instagram_access_token) {
      console.log('Disconnecting Instagram for user:', user.user.id)
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
      .eq('user_id', user.user.id)

    if (error) {
      console.error('Error disconnecting Instagram:', error)
      throw error
    }

    console.log('Successfully disconnected Instagram for user:', user.user.id)

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
    console.error('Error in instagram-disconnect function:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
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