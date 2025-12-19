-- ========================================
-- DROP ALL FUNCTIONS WITH RETURNS TABLE THAT NEED SIGNATURE CHANGE
-- ========================================

DROP FUNCTION IF EXISTS public.get_public_profile_safe(uuid);
DROP FUNCTION IF EXISTS public.get_safe_public_profile(uuid);
DROP FUNCTION IF EXISTS public.get_friend_suggestions_prioritized(uuid, integer);

-- ========================================
-- RECREATE FUNCTIONS WITH CORRECT SIGNATURES
-- ========================================

-- get_public_profile_safe
CREATE FUNCTION public.get_public_profile_safe(profile_user_id uuid)
RETURNS TABLE(
  age integer,
  avatar_url text,
  bio text,
  created_at timestamp with time zone,
  cycling_records json,
  display_name text,
  id uuid,
  is_online boolean,
  is_premium boolean,
  last_seen timestamp with time zone,
  running_records json,
  swimming_records json,
  triathlon_records json,
  user_id uuid,
  username text,
  walking_records json
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.age,
    CASE WHEN p.is_private = false THEN p.avatar_url ELSE NULL END,
    CASE WHEN p.is_private = false THEN p.bio ELSE NULL END,
    p.created_at,
    p.cycling_records::json,
    p.display_name,
    p.id,
    CASE WHEN p.show_online_status = true AND p.is_private = false THEN p.is_online ELSE false END,
    p.is_premium,
    p.last_seen,
    p.running_records::json,
    p.swimming_records::json,
    p.triathlon_records::json,
    p.user_id,
    p.username,
    p.walking_records::json
  FROM public.profiles p
  WHERE p.user_id = profile_user_id
    AND (p.is_private = false OR p.is_private IS NULL);
END;
$function$;

-- get_safe_public_profile
CREATE FUNCTION public.get_safe_public_profile(profile_user_id uuid)
RETURNS TABLE(
  avatar_url text,
  bio text,
  created_at timestamp with time zone,
  display_name text,
  is_online boolean,
  is_premium boolean,
  show_online_status boolean,
  user_id uuid,
  username text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    CASE WHEN p.is_private = false THEN p.avatar_url ELSE NULL END,
    CASE WHEN p.is_private = false THEN p.bio ELSE NULL END,
    p.created_at,
    p.display_name,
    CASE WHEN p.show_online_status = true AND p.is_private = false THEN p.is_online ELSE false END,
    p.is_premium,
    CASE WHEN p.is_private = false THEN p.show_online_status ELSE false END,
    p.user_id,
    p.username
  FROM public.profiles p
  WHERE p.user_id = profile_user_id
    AND p.user_id != auth.uid()
    AND (p.is_private = false OR p.is_private IS NULL);
END;
$function$;

-- get_friend_suggestions_prioritized
CREATE FUNCTION public.get_friend_suggestions_prioritized(current_user_id uuid, suggestion_limit integer DEFAULT 10)
RETURNS TABLE(
  avatar_url text,
  display_name text,
  mutual_friend_names text[],
  mutual_friends_count bigint,
  priority_order integer,
  source text,
  user_id uuid,
  username text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  WITH 
  already_following AS (
    SELECT following_id FROM user_follows 
    WHERE follower_id = current_user_id
  ),
  dismissed AS (
    SELECT dismissed_user_id FROM dismissed_suggestions
    WHERE dismissed_suggestions.user_id = current_user_id
  ),
  mutual_friends_suggestions AS (
    SELECT 
      p.avatar_url,
      p.display_name,
      ARRAY_AGG(DISTINCT p2.display_name) FILTER (WHERE p2.display_name IS NOT NULL) as friend_names,
      COUNT(DISTINCT uf2.follower_id) as mutual_count,
      2 as priority,
      'mutual_friends'::TEXT as source,
      p.user_id,
      p.username
    FROM profiles p
    JOIN user_follows uf1 ON uf1.following_id = p.user_id AND uf1.status = 'accepted'
    JOIN user_follows uf2 ON uf2.follower_id = uf1.follower_id AND uf2.following_id = current_user_id AND uf2.status = 'accepted'
    LEFT JOIN profiles p2 ON p2.user_id = uf1.follower_id
    WHERE p.user_id != current_user_id
      AND p.user_id NOT IN (SELECT following_id FROM already_following)
      AND p.user_id NOT IN (SELECT dismissed_user_id FROM dismissed)
      AND (p.allow_friend_suggestions = true OR p.allow_friend_suggestions IS NULL)
    GROUP BY p.user_id, p.username, p.display_name, p.avatar_url
    ORDER BY mutual_count DESC
    LIMIT 5
  ),
  active_users_suggestions AS (
    SELECT 
      p.avatar_url,
      p.display_name,
      ARRAY[]::TEXT[] as friend_names,
      0::BIGINT as active_count,
      5 as priority,
      'active_users'::TEXT as source,
      p.user_id,
      p.username
    FROM profiles p
    WHERE p.user_id != current_user_id
      AND p.user_id NOT IN (SELECT following_id FROM already_following)
      AND p.user_id NOT IN (SELECT dismissed_user_id FROM dismissed)
      AND p.user_id NOT IN (SELECT mfs.user_id FROM mutual_friends_suggestions mfs)
      AND (p.allow_friend_suggestions = true OR p.allow_friend_suggestions IS NULL)
      AND p.last_seen > NOW() - INTERVAL '7 days'
    ORDER BY p.last_seen DESC NULLS LAST
    LIMIT 5
  )
  SELECT 
    s.avatar_url,
    s.display_name,
    s.friend_names as mutual_friend_names,
    s.mutual_count as mutual_friends_count,
    s.priority as priority_order,
    s.source,
    s.user_id,
    s.username
  FROM mutual_friends_suggestions s
  UNION ALL
  SELECT 
    a.avatar_url,
    a.display_name,
    a.friend_names,
    a.active_count,
    a.priority,
    a.source,
    a.user_id,
    a.username
  FROM active_users_suggestions a
  ORDER BY priority_order, mutual_friends_count DESC NULLS LAST
  LIMIT suggestion_limit;
END;
$function$;