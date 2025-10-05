-- Mise à jour de la fonction pour exclure correctement les utilisateurs déjà suivis
CREATE OR REPLACE FUNCTION public.get_friend_suggestions_prioritized(current_user_id uuid, suggestion_limit integer DEFAULT 10)
 RETURNS TABLE(user_id uuid, username text, display_name text, avatar_url text, mutual_friends_count bigint, mutual_friend_names text[], source text, priority_order integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH user_follows_status AS (
    -- Utilisateurs déjà suivis ou avec demandes en cours (dans les deux sens)
    SELECT DISTINCT
      CASE 
        WHEN uf.follower_id = current_user_id THEN uf.following_id
        WHEN uf.following_id = current_user_id THEN uf.follower_id
      END as excluded_user_id
    FROM user_follows uf
    WHERE (uf.follower_id = current_user_id OR uf.following_id = current_user_id)
      AND uf.status IN ('pending', 'accepted')
  ),
  user_groups AS (
    -- Groupes/clubs de l'utilisateur actuel
    SELECT DISTINCT gm.conversation_id
    FROM group_members gm
    WHERE gm.user_id = current_user_id
  ),
  mutual_friends_data AS (
    -- Calcul des amis en commun
    SELECT 
      p.user_id,
      COUNT(common_friends.friend_id) as mutual_count,
      ARRAY_AGG(common_friends.friend_name ORDER BY common_friends.friend_name) as friend_names
    FROM profiles p
    CROSS JOIN LATERAL (
      SELECT 
        mf.user_id as friend_id,
        COALESCE(mf.display_name, mf.username, 'Utilisateur') as friend_name
      FROM user_follows uf1
      JOIN user_follows uf2 ON uf1.following_id = uf2.following_id
      JOIN profiles mf ON mf.user_id = uf1.following_id
      WHERE uf1.follower_id = current_user_id 
        AND uf2.follower_id = p.user_id
        AND uf1.status = 'accepted'
        AND uf2.status = 'accepted'
        AND uf1.following_id != current_user_id
        AND uf1.following_id != p.user_id
    ) common_friends
    WHERE p.user_id != current_user_id
      AND p.user_id NOT IN (SELECT excluded_user_id FROM user_follows_status WHERE excluded_user_id IS NOT NULL)
      AND (p.is_private = false OR p.is_private IS NULL)
      AND (p.allow_friend_suggestions = true OR p.allow_friend_suggestions IS NULL)
    GROUP BY p.user_id
  ),
  club_members_data AS (
    -- Membres des mêmes clubs
    SELECT DISTINCT 
      gm.user_id,
      COUNT(DISTINCT gm.conversation_id) as common_clubs_count
    FROM group_members gm
    WHERE gm.conversation_id IN (SELECT conversation_id FROM user_groups)
      AND gm.user_id != current_user_id
      AND gm.user_id NOT IN (SELECT excluded_user_id FROM user_follows_status WHERE excluded_user_id IS NOT NULL)
    GROUP BY gm.user_id
  ),
  friends_of_friends AS (
    -- Amis d'amis d'amis (3e degré)
    SELECT DISTINCT
      p.user_id,
      COUNT(DISTINCT path.intermediate_friend) as connection_strength
    FROM profiles p
    CROSS JOIN LATERAL (
      SELECT DISTINCT uf3.follower_id as intermediate_friend
      FROM user_follows uf1
      JOIN user_follows uf2 ON uf1.following_id = uf2.follower_id
      JOIN user_follows uf3 ON uf2.following_id = uf3.follower_id
      WHERE uf1.follower_id = current_user_id
        AND uf1.status = 'accepted'
        AND uf2.status = 'accepted'
        AND uf3.status = 'accepted'
        AND uf3.following_id = p.user_id
        AND uf3.following_id != current_user_id
        AND uf1.following_id != p.user_id
        AND uf2.following_id != p.user_id
    ) path
    WHERE p.user_id != current_user_id
      AND p.user_id NOT IN (SELECT excluded_user_id FROM user_follows_status WHERE excluded_user_id IS NOT NULL)
      AND (p.is_private = false OR p.is_private IS NULL)
      AND (p.allow_friend_suggestions = true OR p.allow_friend_suggestions IS NULL)
    GROUP BY p.user_id
  ),
  all_suggestions AS (
    -- 1. Priorité: Amis en commun (priorité 2)
    SELECT 
      p.user_id,
      COALESCE(p.username, p.display_name, 'user') as username,
      COALESCE(p.display_name, p.username, 'Utilisateur') as display_name,
      p.avatar_url,
      mfd.mutual_count as mutual_friends_count,
      mfd.friend_names as mutual_friend_names,
      'mutual_friends' as source,
      2 as priority_order
    FROM profiles p
    JOIN mutual_friends_data mfd ON p.user_id = mfd.user_id
    WHERE mfd.mutual_count > 0

    UNION ALL

    -- 2. Priorité: Clubs en commun (priorité 3)
    SELECT 
      p.user_id,
      COALESCE(p.username, p.display_name, 'user') as username,
      COALESCE(p.display_name, p.username, 'Utilisateur') as display_name,
      p.avatar_url,
      0 as mutual_friends_count,
      ARRAY[]::text[] as mutual_friend_names,
      'common_clubs' as source,
      3 as priority_order
    FROM profiles p
    JOIN club_members_data cmd ON p.user_id = cmd.user_id
    WHERE p.user_id NOT IN (
      SELECT user_id FROM mutual_friends_data WHERE mutual_count > 0
    )

    UNION ALL

    -- 3. Priorité: Amis d'amis d'amis (priorité 4)
    SELECT 
      p.user_id,
      COALESCE(p.username, p.display_name, 'user') as username,
      COALESCE(p.display_name, p.username, 'Utilisateur') as display_name,
      p.avatar_url,
      0 as mutual_friends_count,
      ARRAY[]::text[] as mutual_friend_names,
      'friends_of_friends' as source,
      4 as priority_order
    FROM profiles p
    JOIN friends_of_friends fof ON p.user_id = fof.user_id
    WHERE p.user_id NOT IN (
      SELECT user_id FROM mutual_friends_data WHERE mutual_count > 0
      UNION
      SELECT user_id FROM club_members_data
    )

    UNION ALL

    -- 4. Fallback: Utilisateurs actifs récents (priorité 5)
    SELECT 
      p.user_id,
      COALESCE(p.username, p.display_name, 'user') as username,
      COALESCE(p.display_name, p.username, 'Utilisateur') as display_name,
      p.avatar_url,
      0 as mutual_friends_count,
      ARRAY[]::text[] as mutual_friend_names,
      'active_users' as source,
      5 as priority_order
    FROM profiles p
    WHERE p.user_id != current_user_id
      AND p.user_id NOT IN (SELECT excluded_user_id FROM user_follows_status WHERE excluded_user_id IS NOT NULL)
      AND (p.is_private = false OR p.is_private IS NULL)
      AND (p.allow_friend_suggestions = true OR p.allow_friend_suggestions IS NULL)
      AND p.last_seen > NOW() - INTERVAL '30 days'
      AND p.user_id NOT IN (
        SELECT user_id FROM mutual_friends_data WHERE mutual_count > 0
        UNION
        SELECT user_id FROM club_members_data
        UNION
        SELECT user_id FROM friends_of_friends
      )
  )
  SELECT 
    user_id,
    username,
    display_name,
    avatar_url,
    mutual_friends_count,
    mutual_friend_names,
    source,
    priority_order
  FROM all_suggestions
  ORDER BY priority_order ASC, mutual_friends_count DESC, display_name ASC
  LIMIT suggestion_limit;
$function$;