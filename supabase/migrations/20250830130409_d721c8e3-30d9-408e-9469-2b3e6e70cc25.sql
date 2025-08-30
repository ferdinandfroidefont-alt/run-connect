-- Fonction pour récupérer le classement complet avec tous les utilisateurs
CREATE OR REPLACE FUNCTION public.get_complete_leaderboard(
  limit_count integer DEFAULT 50,
  offset_count integer DEFAULT 0,
  order_by_column text DEFAULT 'total_points'
)
RETURNS TABLE(
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  total_points integer,
  weekly_points integer,
  seasonal_points integer,
  is_premium boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    p.user_id,
    p.username,
    p.display_name,
    CASE WHEN p.is_private = false THEN p.avatar_url ELSE NULL END as avatar_url,
    COALESCE(us.total_points, 0) as total_points,
    COALESCE(us.weekly_points, 0) as weekly_points,
    COALESCE(us.seasonal_points, 0) as seasonal_points,
    p.is_premium
  FROM profiles p
  LEFT JOIN user_scores us ON p.user_id = us.user_id
  WHERE (p.is_private = false OR p.is_private IS NULL)
  ORDER BY 
    CASE 
      WHEN order_by_column = 'total_points' THEN COALESCE(us.total_points, 0)
      WHEN order_by_column = 'seasonal_points' THEN COALESCE(us.seasonal_points, 0)
      WHEN order_by_column = 'weekly_points' THEN COALESCE(us.weekly_points, 0)
      ELSE COALESCE(us.total_points, 0)
    END DESC,
    p.created_at ASC  -- En cas d'égalité, trier par ancienneté d'inscription
  LIMIT limit_count
  OFFSET offset_count;
$$;

-- Fonction pour compter le nombre total d'utilisateurs dans le classement
CREATE OR REPLACE FUNCTION public.get_leaderboard_total_count()
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::integer
  FROM profiles p
  WHERE (p.is_private = false OR p.is_private IS NULL);
$$;