-- Add monthly points column to user_scores table
ALTER TABLE public.user_scores 
ADD COLUMN monthly_points integer DEFAULT 0,
ADD COLUMN last_monthly_reset timestamp with time zone DEFAULT now();

-- Create function to get user rank based on total points
CREATE OR REPLACE FUNCTION public.get_user_rank(points integer)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT CASE 
    WHEN points >= 3000 THEN 'platine'
    WHEN points >= 2000 THEN 'or'
    WHEN points >= 1000 THEN 'argent'
    WHEN points >= 500 THEN 'bronze'
    ELSE 'novice'
  END;
$$;

-- Update the add_user_points function to include monthly points
CREATE OR REPLACE FUNCTION public.add_user_points(user_id_param uuid, points_to_add integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert or update user score
  INSERT INTO public.user_scores (user_id, total_points, weekly_points, monthly_points, updated_at)
  VALUES (user_id_param, points_to_add, points_to_add, points_to_add, now())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    total_points = user_scores.total_points + points_to_add,
    weekly_points = user_scores.weekly_points + points_to_add,
    monthly_points = user_scores.monthly_points + points_to_add,
    updated_at = now();
END;
$$;

-- Update the remove_user_points function to include monthly points
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
    monthly_points = GREATEST(0, monthly_points - points_to_remove),
    updated_at = now()
  WHERE user_id = user_id_param;
  
  -- If user doesn't exist in scores table, ignore (they had 0 points anyway)
END;
$$;