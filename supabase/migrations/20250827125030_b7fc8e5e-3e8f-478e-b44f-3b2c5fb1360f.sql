-- Remplacer la fonction get_friend_suggestions pour inclure tous les utilisateurs non suivis
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
    -- Calculate mutual friends for better suggestions
    SELECT 
      p.user_id,
      COUNT(mutual.friend_id) as mutual_count,
      ARRAY_AGG(mp.display_name ORDER BY mp.display_name) FILTER (WHERE mp.display_name IS NOT NULL) as friend_names
    FROM profiles p
    LEFT JOIN (
      -- Find mutual friends
      SELECT 
        uf1.following_id as suggested_user,
        uf2.following_id as friend_id
      FROM user_follows uf1
      JOIN user_follows uf2 ON uf1.follower_id = uf2.follower_id
      WHERE uf2.following_id = current_user_id 
        AND uf1.status = 'accepted' 
        AND uf2.status = 'accepted'
        AND uf1.following_id != current_user_id
    ) mutual ON mutual.suggested_user = p.user_id
    LEFT JOIN profiles mp ON mp.user_id = mutual.friend_id
    WHERE p.user_id != current_user_id
      AND p.user_id NOT IN (SELECT user_id FROM user_follows_status)
    GROUP BY p.user_id
  ),
  all_non_followed_users AS (
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
      -- Utiliser l'heure actuelle comme seed pour la rotation
      -- Change toutes les heures grâce à EXTRACT(EPOCH FROM DATE_TRUNC('hour', NOW()))
      (EXTRACT(EPOCH FROM DATE_TRUNC('hour', NOW()))::bigint + p.user_id::text::hash) as rotation_seed
    FROM profiles p
    LEFT JOIN mutual_friends_info mfi ON mfi.user_id = p.user_id
    WHERE p.user_id != current_user_id
      AND p.user_id NOT IN (SELECT user_id FROM user_follows_status)
  )
  SELECT 
    anu.user_id,
    anu.username,
    anu.display_name,
    anu.avatar_url,
    anu.mutual_friends_count,
    anu.mutual_friend_names,
    anu.source
  FROM all_non_followed_users anu
  ORDER BY 
    -- Prioriser les amis mutuels
    CASE WHEN anu.source = 'mutual_friends' THEN 1 ELSE 2 END,
    anu.mutual_friends_count DESC,
    -- Rotation basée sur l'heure
    (anu.rotation_seed % 1000000)
  LIMIT suggestion_limit;
$function$;