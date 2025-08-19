-- Update the get_user_rank function to include diamond rank
CREATE OR REPLACE FUNCTION public.get_user_rank(points integer)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT CASE 
    WHEN points >= 5000 THEN 'diamant'
    WHEN points >= 3000 THEN 'platine'
    WHEN points >= 2000 THEN 'or'
    WHEN points >= 1000 THEN 'argent'
    WHEN points >= 500 THEN 'bronze'
    ELSE 'novice'
  END;
$$;

-- Rename monthly columns to seasonal
ALTER TABLE public.user_scores 
RENAME COLUMN monthly_points TO seasonal_points;

ALTER TABLE public.user_scores 
RENAME COLUMN last_monthly_reset TO last_seasonal_reset;

-- Update the add_user_points function with seasonal points
CREATE OR REPLACE FUNCTION public.add_user_points(user_id_param uuid, points_to_add integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert or update user score
  INSERT INTO public.user_scores (user_id, total_points, weekly_points, seasonal_points, updated_at)
  VALUES (user_id_param, points_to_add, points_to_add, points_to_add, now())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    total_points = user_scores.total_points + points_to_add,
    weekly_points = user_scores.weekly_points + points_to_add,
    seasonal_points = user_scores.seasonal_points + points_to_add,
    updated_at = now();
END;
$$;

-- Update the remove_user_points function with seasonal points
CREATE OR REPLACE FUNCTION public.remove_user_points(user_id_param uuid, points_to_remove integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update user score, ensuring points don't go below 0
  UPDATE public.user_scores 
  SET 
    total_points = GREATEST(0, total_points - points_to_remove),
    weekly_points = GREATEST(0, weekly_points - points_to_remove),
    seasonal_points = GREATEST(0, seasonal_points - points_to_remove),
    updated_at = now()
  WHERE user_id = user_id_param;
  
  -- If user doesn't exist in scores table, ignore (they had 0 points anyway)
END;
$$;