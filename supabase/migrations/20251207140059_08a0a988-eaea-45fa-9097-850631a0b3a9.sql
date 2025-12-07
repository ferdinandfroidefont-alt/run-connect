-- Create table for dismissed suggestions
CREATE TABLE public.dismissed_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  dismissed_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, dismissed_user_id)
);

-- Enable RLS
ALTER TABLE public.dismissed_suggestions ENABLE ROW LEVEL SECURITY;

-- Users can insert their own dismissals
CREATE POLICY "Users can dismiss suggestions"
ON public.dismissed_suggestions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own dismissals
CREATE POLICY "Users can view their dismissed suggestions"
ON public.dismissed_suggestions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can delete their own dismissals (to re-enable suggestions)
CREATE POLICY "Users can delete their dismissed suggestions"
ON public.dismissed_suggestions
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_dismissed_suggestions_user_id ON public.dismissed_suggestions(user_id);

-- Update the get_friend_suggestions_prioritized function to exclude dismissed suggestions
CREATE OR REPLACE FUNCTION public.get_friend_suggestions_prioritized(
  current_user_id UUID,
  suggestion_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  mutual_friends_count BIGINT,
  mutual_friend_names TEXT[],
  source TEXT,
  priority_order INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH 
  -- Get users the current user already follows
  already_following AS (
    SELECT following_id FROM user_follows 
    WHERE follower_id = current_user_id
  ),
  -- Get dismissed suggestions
  dismissed AS (
    SELECT dismissed_user_id FROM dismissed_suggestions
    WHERE dismissed_suggestions.user_id = current_user_id
  ),
  -- Get mutual friends suggestions (priority 2)
  mutual_friends_suggestions AS (
    SELECT 
      p.user_id,
      p.username,
      p.display_name,
      p.avatar_url,
      COUNT(DISTINCT uf2.follower_id) as mutual_count,
      ARRAY_AGG(DISTINCT p2.display_name) FILTER (WHERE p2.display_name IS NOT NULL) as friend_names,
      'mutual_friends'::TEXT as source,
      2 as priority
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
  -- Get common clubs suggestions (priority 3)
  common_clubs_suggestions AS (
    SELECT 
      p.user_id,
      p.username,
      p.display_name,
      p.avatar_url,
      COUNT(DISTINCT gm2.conversation_id) as club_count,
      ARRAY[]::TEXT[] as friend_names,
      'common_clubs'::TEXT as source,
      3 as priority
    FROM profiles p
    JOIN group_members gm1 ON gm1.user_id = p.user_id
    JOIN group_members gm2 ON gm2.conversation_id = gm1.conversation_id AND gm2.user_id = current_user_id
    JOIN conversations c ON c.id = gm1.conversation_id AND c.is_group = true
    WHERE p.user_id != current_user_id
      AND p.user_id NOT IN (SELECT following_id FROM already_following)
      AND p.user_id NOT IN (SELECT dismissed_user_id FROM dismissed)
      AND p.user_id NOT IN (SELECT mfs.user_id FROM mutual_friends_suggestions mfs)
      AND (p.allow_friend_suggestions = true OR p.allow_friend_suggestions IS NULL)
    GROUP BY p.user_id, p.username, p.display_name, p.avatar_url
    ORDER BY club_count DESC
    LIMIT 3
  ),
  -- Get friends of friends suggestions (priority 4)
  friends_of_friends_suggestions AS (
    SELECT 
      p.user_id,
      p.username,
      p.display_name,
      p.avatar_url,
      0::BIGINT as friend_count,
      ARRAY[]::TEXT[] as friend_names,
      'friends_of_friends'::TEXT as source,
      4 as priority
    FROM profiles p
    JOIN user_follows uf1 ON uf1.following_id = p.user_id AND uf1.status = 'accepted'
    JOIN user_follows uf2 ON uf2.following_id = uf1.follower_id AND uf2.follower_id = current_user_id AND uf2.status = 'accepted'
    WHERE p.user_id != current_user_id
      AND p.user_id NOT IN (SELECT following_id FROM already_following)
      AND p.user_id NOT IN (SELECT dismissed_user_id FROM dismissed)
      AND p.user_id NOT IN (SELECT mfs.user_id FROM mutual_friends_suggestions mfs)
      AND p.user_id NOT IN (SELECT ccs.user_id FROM common_clubs_suggestions ccs)
      AND (p.allow_friend_suggestions = true OR p.allow_friend_suggestions IS NULL)
    GROUP BY p.user_id, p.username, p.display_name, p.avatar_url
    LIMIT 3
  ),
  -- Get active users suggestions (priority 5)
  active_users_suggestions AS (
    SELECT 
      p.user_id,
      p.username,
      p.display_name,
      p.avatar_url,
      0::BIGINT as active_count,
      ARRAY[]::TEXT[] as friend_names,
      'active_users'::TEXT as source,
      5 as priority
    FROM profiles p
    WHERE p.user_id != current_user_id
      AND p.user_id NOT IN (SELECT following_id FROM already_following)
      AND p.user_id NOT IN (SELECT dismissed_user_id FROM dismissed)
      AND p.user_id NOT IN (SELECT mfs.user_id FROM mutual_friends_suggestions mfs)
      AND p.user_id NOT IN (SELECT ccs.user_id FROM common_clubs_suggestions ccs)
      AND p.user_id NOT IN (SELECT fof.user_id FROM friends_of_friends_suggestions fof)
      AND (p.allow_friend_suggestions = true OR p.allow_friend_suggestions IS NULL)
      AND p.last_seen > NOW() - INTERVAL '7 days'
    ORDER BY p.last_seen DESC NULLS LAST
    LIMIT 3
  )
  -- Combine all suggestions with priority order
  SELECT * FROM mutual_friends_suggestions
  UNION ALL
  SELECT * FROM common_clubs_suggestions
  UNION ALL
  SELECT * FROM friends_of_friends_suggestions
  UNION ALL
  SELECT * FROM active_users_suggestions
  ORDER BY priority, mutual_count DESC NULLS LAST
  LIMIT suggestion_limit;
END;
$$;