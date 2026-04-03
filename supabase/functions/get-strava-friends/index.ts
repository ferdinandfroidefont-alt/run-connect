import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireUserJwtCors } from "../_shared/auth.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logDbError, logException, logHttpUpstream, logStructured, logUserRef } from "../_shared/secureLog.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const auth = await requireUserJwtCors(req, supabaseClient, corsHeaders);
  if (auth instanceof Response) return auth;

  const user = auth.user;

  try {
    logStructured("get-strava-friends", "start", { user: logUserRef(user.id) });

    // Get user's Strava profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('strava_access_token, strava_user_id, strava_connected')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profileError) {
      logDbError("get-strava-friends", profileError);
      return new Response(
        JSON.stringify({ error: 'Database error', friends: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!profile) {
      return new Response(
        JSON.stringify({ error: 'Profile not found', friends: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!profile?.strava_connected || !profile?.strava_access_token) {
      return new Response(
        JSON.stringify({ error: 'Strava not connected', friends: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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
      logHttpUpstream("get-strava-friends", followingResponse.status, `following`);
      logHttpUpstream("get-strava-friends", followersResponse.status, `followers`);
      
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
      allStravaFriends = [...allStravaFriends, ...following]
    }
    
    if (followersResponse.ok) {
      const followers = await followersResponse.json()
      allStravaFriends = [...allStravaFriends, ...followers]
    }

    // Remove duplicates based on ID
    const uniqueFriends = allStravaFriends.filter((friend, index, self) => 
      index === self.findIndex(f => f.id === friend.id)
    )
    
    // Extract Strava user IDs
    const stravaUserIds = uniqueFriends.map((friend: any) => friend.id.toString())

    if (stravaUserIds.length === 0) {
      return new Response(
        JSON.stringify({ friends: [], message: 'No friends found on Strava' }),
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

    logStructured("get-strava-friends", "done", {
      user: logUserRef(user.id),
      strava_contacts: uniqueFriends.length,
      app_matches: friendsWithStats.length,
    });

    return new Response(
      JSON.stringify({ friends: friendsWithStats }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    logException("get-strava-friends", error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', friends: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})