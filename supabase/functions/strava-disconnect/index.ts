import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
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

    // First, get the current profile to retrieve Strava tokens
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('strava_access_token')
      .eq('user_id', user.user.id)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
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
          console.warn('Failed to revoke Strava token, but continuing with local disconnect')
        } else {
          console.log('Successfully revoked Strava authorization')
        }
      } catch (revokeError) {
        console.warn('Error revoking Strava token:', revokeError, 'but continuing with local disconnect')
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
      .eq('user_id', user.user.id)

    if (error) {
      console.error('Error disconnecting Strava:', error)
      throw error
    }

    console.log('Successfully disconnected Strava for user:', user.user.id)

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
    console.error('Error in strava-disconnect function:', error)
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