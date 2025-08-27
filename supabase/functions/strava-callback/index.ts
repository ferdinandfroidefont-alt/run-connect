import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')

    if (error) {
      console.error('Strava OAuth error:', error)
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${Deno.env.get('SUPABASE_URL').replace('.supabase.co', '')}.lovableproject.com/?strava_error=${error}`
        }
      })
    }

    if (!code || !state) {
      throw new Error('Missing code or state parameter')
    }

    // Initialize Supabase client with service role key for admin operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Exchange code for access token
    const stravaClientId = Deno.env.get('STRAVA_CLIENT_ID')
    const stravaClientSecret = Deno.env.get('STRAVA_CLIENT_SECRET')

    if (!stravaClientId || !stravaClientSecret) {
      throw new Error('Strava credentials not configured')
    }

    const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: stravaClientId,
        client_secret: stravaClientSecret,
        code: code,
        grant_type: 'authorization_code',
      }),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      console.error('Strava token exchange error:', tokenData)
      throw new Error('Failed to exchange code for token')
    }

    // Update user profile with Strava data
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({
        strava_connected: true,
        strava_verified_at: new Date().toISOString(),
        strava_user_id: tokenData.athlete.id.toString(),
        strava_access_token: tokenData.access_token,
        strava_refresh_token: tokenData.refresh_token,
      })
      .eq('user_id', state)

    if (updateError) {
      console.error('Error updating profile:', updateError)
      throw updateError
    }

    console.log('Successfully connected Strava for user:', state)

    // Redirect back to the app
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `${Deno.env.get('SUPABASE_URL').replace('.supabase.co', '')}.lovableproject.com/?strava_success=true`
      }
    })

  } catch (error) {
    console.error('Error in strava-callback function:', error)
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `${Deno.env.get('SUPABASE_URL').replace('.supabase.co', '')}.lovableproject.com/?strava_error=${encodeURIComponent(error.message)}`
      }
    })
  }
})