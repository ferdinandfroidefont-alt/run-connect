-- Function to get friend suggestions based on mutual connections
CREATE OR REPLACE FUNCTION public.get_friend_suggestions(current_user_id uuid, suggestion_limit integer DEFAULT 10)
RETURNS TABLE(
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  mutual_friends_count bigint,
  mutual_friend_names text[]
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
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
        -- Don't suggest people already followed
        SELECT following_id 
        FROM user_follows 
        WHERE follower_id = current_user_id
      )
  ),
  suggestion_stats AS (
    -- Count mutual friends and get their names
    SELECT 
      fof.suggested_user_id,
      COUNT(*) as mutual_count,
      ARRAY_AGG(p.display_name ORDER BY p.display_name) as friend_names
    FROM friends_of_friends fof
    JOIN profiles p ON p.user_id = fof.mutual_friend_id
    GROUP BY fof.suggested_user_id
    HAVING COUNT(*) >= 1  -- At least 1 mutual friend
  )
  SELECT 
    p.user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    ss.mutual_count,
    ss.friend_names
  FROM suggestion_stats ss
  JOIN profiles p ON p.user_id = ss.suggested_user_id
  WHERE p.is_private = false  -- Only suggest public profiles
  ORDER BY ss.mutual_count DESC, p.display_name
  LIMIT suggestion_limit;
$$;