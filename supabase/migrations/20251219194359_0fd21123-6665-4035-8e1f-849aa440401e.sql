-- ========================================
-- DROP ALL FUNCTIONS WITH INCOMPATIBLE SIGNATURES FIRST
-- ========================================

DROP FUNCTION IF EXISTS public.get_referral_stats(uuid);
DROP FUNCTION IF EXISTS public.get_common_clubs(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_complete_leaderboard(integer, integer, text);

-- ========================================
-- RECREATE ALL REMAINING FUNCTIONS WITH SECURITY SETTINGS
-- ========================================

-- 6. get_referral_stats
CREATE FUNCTION public.get_referral_stats(user_id_param uuid)
RETURNS TABLE(referral_code text, total_referrals bigint, total_rewards bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    rl.unique_code as referral_code,
    COUNT(r.id)::bigint as total_referrals,
    (COUNT(r.id) * 50)::bigint as total_rewards
  FROM referral_links rl
  LEFT JOIN referrals r ON r.referral_code = rl.unique_code
  WHERE rl.user_id = user_id_param
  GROUP BY rl.unique_code;
END;
$function$;

-- 5. get_common_clubs
CREATE FUNCTION public.get_common_clubs(user_1_id uuid, user_2_id uuid)
RETURNS TABLE(club_id uuid, club_name text, club_description text, club_avatar_url text, club_code text, created_by uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as club_id,
    c.group_name as club_name,
    c.group_description as club_description,
    c.group_avatar_url as club_avatar_url,
    c.club_code,
    c.created_by
  FROM conversations c
  JOIN group_members gm1 ON gm1.conversation_id = c.id AND gm1.user_id = user_1_id
  JOIN group_members gm2 ON gm2.conversation_id = c.id AND gm2.user_id = user_2_id
  WHERE c.is_group = true;
END;
$function$;

-- 16. get_complete_leaderboard
CREATE FUNCTION public.get_complete_leaderboard(limit_count integer DEFAULT 100, offset_count integer DEFAULT 0, order_by_column text DEFAULT 'total_points')
RETURNS TABLE(user_id uuid, username text, display_name text, avatar_url text, total_points integer, seasonal_points integer, weekly_points integer, is_premium boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
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
  WHERE COALESCE(us.total_points, 0) > 0
  ORDER BY 
    CASE WHEN order_by_column = 'seasonal_points' THEN us.seasonal_points ELSE NULL END DESC NULLS LAST,
    CASE WHEN order_by_column = 'weekly_points' THEN us.weekly_points ELSE NULL END DESC NULLS LAST,
    CASE WHEN order_by_column = 'total_points' OR order_by_column NOT IN ('seasonal_points', 'weekly_points') THEN us.total_points ELSE NULL END DESC NULLS LAST
  LIMIT limit_count
  OFFSET offset_count;
END;
$function$;

-- 7. trigger_season_reset
CREATE OR REPLACE FUNCTION public.trigger_season_reset()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE user_scores
  SET seasonal_points = 0, last_seasonal_reset = NOW()
  WHERE last_seasonal_reset < NOW() - INTERVAL '45 days';
END;
$function$;

-- 8. process_referral
CREATE OR REPLACE FUNCTION public.process_referral(referral_code_param text, new_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  referrer_user_id UUID;
BEGIN
  SELECT user_id INTO referrer_user_id 
  FROM referral_links 
  WHERE unique_code = referral_code_param;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM referrals WHERE referred_id = new_user_id) THEN
    RETURN FALSE;
  END IF;
  
  INSERT INTO referrals (referrer_id, referred_id, referral_code)
  VALUES (referrer_user_id, new_user_id, referral_code_param);
  
  PERFORM add_user_points(referrer_user_id, 50);
  
  RETURN TRUE;
END;
$function$;

-- 9. generate_referral_code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  new_code TEXT;
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  i INT;
BEGIN
  LOOP
    new_code := '';
    FOR i IN 1..8 LOOP
      new_code := new_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    
    EXIT WHEN NOT EXISTS (SELECT 1 FROM referral_links WHERE unique_code = new_code);
  END LOOP;
  
  RETURN new_code;
END;
$function$;

-- 10. generate_club_code
CREATE OR REPLACE FUNCTION public.generate_club_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  new_code TEXT;
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  i INT;
BEGIN
  LOOP
    new_code := '';
    FOR i IN 1..6 LOOP
      new_code := new_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    
    EXIT WHEN NOT EXISTS (SELECT 1 FROM conversations WHERE club_code = new_code);
  END LOOP;
  
  RETURN new_code;
END;
$function$;

-- 11. update_push_token
CREATE OR REPLACE FUNCTION public.update_push_token(user_id_param uuid, push_token_param text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE profiles 
  SET push_token = push_token_param, push_token_updated_at = NOW()
  WHERE user_id = user_id_param;
END;
$function$;

-- 12. add_user_points
CREATE OR REPLACE FUNCTION public.add_user_points(user_id_param uuid, points_to_add integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO user_scores (user_id, total_points, seasonal_points, weekly_points)
  VALUES (user_id_param, points_to_add, points_to_add, points_to_add)
  ON CONFLICT (user_id) DO UPDATE SET
    total_points = user_scores.total_points + EXCLUDED.total_points,
    seasonal_points = user_scores.seasonal_points + EXCLUDED.seasonal_points,
    weekly_points = user_scores.weekly_points + EXCLUDED.weekly_points,
    updated_at = NOW();
END;
$function$;

-- 13. remove_user_points
CREATE OR REPLACE FUNCTION public.remove_user_points(user_id_param uuid, points_to_remove integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE user_scores SET
    total_points = GREATEST(0, total_points - points_to_remove),
    seasonal_points = GREATEST(0, seasonal_points - points_to_remove),
    weekly_points = GREATEST(0, weekly_points - points_to_remove),
    updated_at = NOW()
  WHERE user_id = user_id_param;
END;
$function$;

-- 14. increment_daily_message_count
CREATE OR REPLACE FUNCTION public.increment_daily_message_count(user_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  new_count INTEGER;
BEGIN
  INSERT INTO daily_message_limits (user_id, date, message_count)
  VALUES (user_id_param, CURRENT_DATE, 1)
  ON CONFLICT (user_id, date) DO UPDATE 
  SET message_count = daily_message_limits.message_count + 1, updated_at = NOW()
  RETURNING message_count INTO new_count;
  
  RETURN new_count;
END;
$function$;

-- 15. get_leaderboard_total_count
CREATE OR REPLACE FUNCTION public.get_leaderboard_total_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT COUNT(*)::integer FROM user_scores WHERE total_points > 0;
$function$;