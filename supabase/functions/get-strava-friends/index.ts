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

    console.log('Getting Strava friends for user:', user.id)

    // Get user's Strava profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('strava_access_token, strava_user_id, strava_connected')
      .eq('user_id', user.id)
      .maybeSingle()

    console.log('Profile query result:', {
      profileFound: !!profile,
      strava_connected: profile?.strava_connected,
      has_access_token: !!profile?.strava_access_token,
      strava_user_id: profile?.strava_user_id,
      error: profileError
    })

    if (profileError) {
      console.error('Profile error:', profileError)
      return new Response(
        JSON.stringify({ error: 'Database error', friends: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!profile) {
      console.log('No profile found for user:', user.id)
      return new Response(
        JSON.stringify({ error: 'Profile not found', friends: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!profile?.strava_connected || !profile?.strava_access_token) {
      console.log('Strava not connected for user:', user.id, {
        strava_connected: profile?.strava_connected,
        has_access_token: !!profile?.strava_access_token
      })
      return new Response(
        JSON.stringify({ error: 'Strava not connected', friends: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User has Strava connected, fetching friends...')

    // Get Strava friends using the access token - try both following and followers
    const [followingResponse, followersResponse] = await Promise.all([
      fetch(`https://www.strava.com/api/v3/athlete/following?per_page=200`, {
        headers: {
          'Authorization': `Bearer ${profile.strava_access_token}`,
          'Accept': 'application/json',
        }
      }),
      fetch(`https://www.strava.com/api/v3/athlete/followers?per_page=200`, {
        headers: {
          'Authorization': `Bearer ${profile.strava_access_token}`,
          'Accept': 'application/json',
        }
      })
    ])

    // Check responses
    if (!followingResponse.ok && !followersResponse.ok) {
      console.error('Both Strava API calls failed:', followingResponse.status, followersResponse.status)
      
      if (followingResponse.status === 401 || followersResponse.status === 401) {
        return new Response(
          JSON.stringify({ friends: [], message: 'Strava token expired' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to fetch Strava friends', friends: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Combine following and followers
    let allStravaFriends: any[] = []
    
    if (followingResponse.ok) {
      const following = await followingResponse.json()
      console.log('Strava following count:', following.length)
      allStravaFriends = [...allStravaFriends, ...following]
    }
    
    if (followersResponse.ok) {
      const followers = await followersResponse.json()
      console.log('Strava followers count:', followers.length)
      allStravaFriends = [...allStravaFriends, ...followers]
    }

    // Remove duplicates based on ID
    const uniqueFriends = allStravaFriends.filter((friend, index, self) => 
      index === self.findIndex(f => f.id === friend.id)
    )
    
    console.log('Total unique Strava friends count:', uniqueFriends.length)

    // Extract Strava user IDs
    const stravaUserIds = uniqueFriends.map((friend: any) => friend.id.toString())

    if (stravaUserIds.length === 0) {
      console.log('No Strava friends found')
      return new Response(
        JSON.stringify({ friends: [], message: 'No friends found on Strava' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Looking for Strava user IDs in app:', stravaUserIds.slice(0, 5)) // Log first 5 IDs

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
      .neq('user_id', user.id)

    if (appUsersError) {
      console.error('Error finding app users:', appUsersError)
      return new Response(
        JSON.stringify({ error: 'Database error', friends: [] }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Found app users with Strava connection:', appUsers?.length || 0)

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

    console.log('Returning', friendsWithStats.length, 'Strava friends with stats')

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