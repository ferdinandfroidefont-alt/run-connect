-- Drop and recreate the get_friend_suggestions function with new structure
DROP FUNCTION IF EXISTS public.get_friend_suggestions(uuid, integer);

CREATE OR REPLACE FUNCTION public.get_friend_suggestions(current_user_id uuid, suggestion_limit integer DEFAULT 5)
 RETURNS TABLE(user_id uuid, username text, display_name text, avatar_url text, mutual_friends_count bigint, mutual_friend_names text[], source text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH user_friends AS (
    -- Get current user's accepted friends
    SELECT following_id as friend_id
    FROM user_follows 
    WHERE follower_id = current_user_id AND status = 'accepted'
  ),
  friends_of_friends AS (
    -- Get friends of user's friends
    SELECT 
      uf.following_id as suggested_user_id,
      uf.follower_id as mutual_friend_id
    FROM user_follows uf
    JOIN user_friends ufr ON uf.follower_id = ufr.friend_id
    WHERE uf.status = 'accepted'
      AND uf.following_id != current_user_id  -- Don't suggest self
      AND uf.following_id NOT IN (
        -- Don't suggest people already followed or with pending requests
        SELECT following_id 
        FROM user_follows 
        WHERE follower_id = current_user_id
      )
  ),
  mutual_friend_suggestions AS (
    -- Count mutual friends and get their names
    SELECT 
      fof.suggested_user_id,
      COUNT(*) as mutual_count,
      ARRAY_AGG(p.display_name ORDER BY p.display_name) as friend_names
    FROM friends_of_friends fof
    JOIN profiles p ON p.user_id = fof.mutual_friend_id
    GROUP BY fof.suggested_user_id
    HAVING COUNT(*) >= 1  -- At least 1 mutual friend
  ),
  active_users AS (
    -- Get other active users (recently seen) who are not already friends
    SELECT p.user_id
    FROM profiles p
    WHERE p.user_id != current_user_id
      AND p.is_private = false
      AND p.allow_friend_suggestions = true
      AND p.last_seen > NOW() - INTERVAL '7 days'  -- Active in last 7 days
      AND p.user_id NOT IN (
        -- Exclude existing friends and pending requests
        SELECT following_id 
        FROM user_follows 
        WHERE follower_id = current_user_id
      )
      AND p.user_id NOT IN (
        -- Exclude users already in mutual friend suggestions
        SELECT suggested_user_id FROM mutual_friend_suggestions
      )
  ),
  all_suggestions AS (
    -- Priority 1: Mutual friend suggestions
    SELECT 
      p.user_id,
      p.username,
      p.display_name,
      p.avatar_url,
      mfs.mutual_count as mutual_friends_count,
      mfs.friend_names as mutual_friend_names,
      'mutual_friends' as source,
      1 as priority_order
    FROM mutual_friend_suggestions mfs
    JOIN profiles p ON p.user_id = mfs.suggested_user_id
    WHERE p.is_private = false
      AND p.allow_friend_suggestions = true
      AND EXISTS (
        -- Only show suggestions if current user allows friend suggestions
        SELECT 1 FROM profiles cp 
        WHERE cp.user_id = current_user_id 
          AND cp.allow_friend_suggestions = true
      )
    
    UNION ALL
    
    -- Priority 2: Active users (no mutual friends)
    SELECT 
      p.user_id,
      p.username,
      p.display_name,
      p.avatar_url,
      0 as mutual_friends_count,
      ARRAY[]::text[] as mutual_friend_names,
      'active_users' as source,
      2 as priority_order
    FROM active_users au
    JOIN profiles p ON p.user_id = au.user_id
    WHERE EXISTS (
      -- Only show suggestions if current user allows friend suggestions
      SELECT 1 FROM profiles cp 
      WHERE cp.user_id = current_user_id 
        AND cp.allow_friend_suggestions = true
    )
  )
  SELECT 
    als.user_id,
    als.username,
    als.display_name,
    als.avatar_url,
    als.mutual_friends_count,
    als.mutual_friend_names,
    als.source
  FROM all_suggestions als
  ORDER BY 
    als.priority_order ASC,  -- Mutual friends first, then active users
    als.mutual_friends_count DESC,  -- More mutual friends first
    RANDOM()  -- Random order for variety
  LIMIT suggestion_limit;
$function$;