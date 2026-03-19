DROP FUNCTION IF EXISTS public.get_complete_leaderboard(integer, integer, text);

CREATE FUNCTION public.get_complete_leaderboard(limit_count integer, offset_count integer, order_by_column text)
RETURNS TABLE(user_id uuid, username text, display_name text, avatar_url text, total_points integer, seasonal_points integer, weekly_points integer, is_premium boolean)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    COALESCE(us.total_points, 0)::integer as total_points,
    COALESCE(us.seasonal_points, 0)::integer as seasonal_points,
    COALESCE(us.weekly_points, 0)::integer as weekly_points,
    COALESCE(p.is_premium, false) as is_premium
  FROM profiles p
  LEFT JOIN user_scores us ON us.user_id = p.user_id
  WHERE p.user_id IS NOT NULL
  ORDER BY 
    CASE WHEN order_by_column = 'seasonal_points' THEN COALESCE(us.seasonal_points, 0) ELSE NULL END DESC NULLS LAST,
    CASE WHEN order_by_column = 'weekly_points' THEN COALESCE(us.weekly_points, 0) ELSE NULL END DESC NULLS LAST,
    CASE WHEN order_by_column = 'total_points' OR order_by_column NOT IN ('seasonal_points', 'weekly_points') THEN COALESCE(us.total_points, 0) ELSE NULL END DESC NULLS LAST
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;