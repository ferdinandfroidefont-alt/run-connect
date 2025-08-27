-- Corriger la fonction get_friend_suggestions pour inclure TOUS les utilisateurs non suivis
CREATE OR REPLACE FUNCTION public.get_friend_suggestions(current_user_id uuid, suggestion_limit integer DEFAULT 10)
RETURNS TABLE(user_id uuid, username text, display_name text, avatar_url text, mutual_friends_count bigint, mutual_friend_names text[], source text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH user_follows_status AS (
    -- Get all users that the current user follows or has pending requests with
    SELECT following_id as user_id
    FROM user_follows 
    WHERE follower_id = current_user_id
  ),
  mutual_friends_info AS (
    -- Calculate mutual friends for users
    SELECT 
      p.user_id,
      COUNT(CASE WHEN uf1.following_id IS NOT NULL THEN 1 END) as mutual_count,
      ARRAY_AGG(mp.display_name ORDER BY mp.display_name) FILTER (WHERE mp.display_name IS NOT NULL AND uf1.following_id IS NOT NULL) as friend_names
    FROM profiles p
    LEFT JOIN user_follows uf_current ON uf_current.following_id = p.user_id 
      AND uf_current.follower_id = current_user_id 
      AND uf_current.status = 'accepted'
    LEFT JOIN user_follows uf1 ON uf1.follower_id = p.user_id 
      AND uf1.status = 'accepted'
      AND uf1.following_id IN (
        SELECT following_id FROM user_follows 
        WHERE follower_id = current_user_id AND status = 'accepted'
      )
    LEFT JOIN profiles mp ON mp.user_id = uf1.following_id
    WHERE p.user_id != current_user_id
      AND p.user_id NOT IN (SELECT user_id FROM user_follows_status)
      AND uf_current.following_id IS NULL -- Not already followed
    GROUP BY p.user_id
  ),
  all_available_users AS (
    SELECT 
      p.user_id,
      p.username,
      p.display_name,
      p.avatar_url,
      COALESCE(mfi.mutual_count, 0) as mutual_friends_count,
      COALESCE(mfi.friend_names, ARRAY[]::text[]) as mutual_friend_names,
      CASE 
        WHEN COALESCE(mfi.mutual_count, 0) > 0 THEN 'mutual_friends'
        WHEN p.last_seen > NOW() - INTERVAL '7 days' THEN 'active_users'
        ELSE 'other_users'
      END as source,
      -- Rotation seed based on current hour
      (EXTRACT(EPOCH FROM DATE_TRUNC('hour', NOW()))::bigint + 
       ('x' || substr(md5(p.user_id::text), 1, 8))::bit(32)::bigint) as rotation_seed
    FROM profiles p
    LEFT JOIN mutual_friends_info mfi ON mfi.user_id = p.user_id
    WHERE p.user_id != current_user_id
      AND p.user_id NOT IN (SELECT user_id FROM user_follows_status)
      -- Supprimer les filtres restrictifs pour inclure TOUS les utilisateurs
  )
  SELECT 
    anu.user_id,
    anu.username,
    anu.display_name,
    anu.avatar_url,
    anu.mutual_friends_count,
    anu.mutual_friend_names,
    anu.source
  FROM all_available_users anu
  ORDER BY 
    -- Priority: mutual friends first, then active users, then others
    CASE 
      WHEN anu.source = 'mutual_friends' THEN 1 
      WHEN anu.source = 'active_users' THEN 2 
      ELSE 3 
    END,
    anu.mutual_friends_count DESC,
    -- Hourly rotation
    (anu.rotation_seed % 1000000)
  LIMIT suggestion_limit;
$function$;