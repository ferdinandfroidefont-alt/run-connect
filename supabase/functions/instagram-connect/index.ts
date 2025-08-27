import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    // Get user from request
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: user } = await supabaseClient.auth.getUser(token)

    if (!user.user) {
      throw new Error('Not authenticated')
    }

    const instagramClientId = Deno.env.get('INSTAGRAM_CLIENT_ID')
    if (!instagramClientId) {
      throw new Error('Instagram client ID not configured')
    }

    // Generate Instagram OAuth URL
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/instagram-callback`
    const scope = 'user_profile,user_media'
    const state = user.user.id // Use user ID as state for security

    const authUrl = `https://api.instagram.com/oauth/authorize` +
      `?client_id=${instagramClientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${scope}` +
      `&response_type=code` +
      `&state=${state}`

    console.log('Generated Instagram auth URL for user:', user.user.id)

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
    console.error('Error in instagram-connect function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
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