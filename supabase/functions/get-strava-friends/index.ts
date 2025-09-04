import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    // Get user from the token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    
    if (userError || !user) {
      console.error('Authentication error:', userError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user's Strava profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('strava_access_token, strava_user_id')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile?.strava_access_token) {
      console.error('Profile error:', profileError)
      return new Response(
        JSON.stringify({ error: 'Strava not connected', friends: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Strava friends using the access token
    const stravaResponse = await fetch(`https://www.strava.com/api/v3/athlete/following?per_page=200`, {
      headers: {
        'Authorization': `Bearer ${profile.strava_access_token}`,
        'Accept': 'application/json',
      }
    })

    if (!stravaResponse.ok) {
      console.error('Strava API error:', stravaResponse.status, await stravaResponse.text())
      return new Response(
        JSON.stringify({ error: 'Failed to fetch Strava friends', friends: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const stravaFriends = await stravaResponse.json()
    console.log('Strava friends count:', stravaFriends.length)

    // Extract Strava user IDs
    const stravaUserIds = stravaFriends.map((friend: any) => friend.id.toString())

    if (stravaUserIds.length === 0) {
      return new Response(
        JSON.stringify({ friends: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find users in our app who have these Strava IDs
    const { data: appUsers, error: appUsersError } = await supabaseClient
      .from('profiles')
      .select(`
        user_id,
        username,
        display_name,
        avatar_url,
        bio,
        is_private,
        strava_user_id
      `)
      .in('strava_user_id', stravaUserIds)
      .eq('is_private', false)
      .neq('user_id', user.id)

    if (appUsersError) {
      console.error('Error finding app users:', appUsersError)
      return new Response(
        JSON.stringify({ error: 'Database error', friends: [] }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get follower counts for each user
    const friendsWithStats = await Promise.all(
      (appUsers || []).map(async (friend) => {
        const { data: followerData } = await supabaseClient.rpc('get_follower_count', { 
          profile_user_id: friend.user_id 
        })
        const { data: followingData } = await supabaseClient.rpc('get_following_count', { 
          profile_user_id: friend.user_id 
        })
        
        return {
          ...friend,
          follower_count: followerData || 0,
          following_count: followingData || 0
        }
      })
    )

    console.log('Found', friendsWithStats.length, 'Strava friends in app')

    return new Response(
      JSON.stringify({ friends: friendsWithStats }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in get-strava-friends function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', friends: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})