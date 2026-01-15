-- =====================================================
-- MIGRATION SÉCURITÉ CRITIQUE - RunConnect
-- =====================================================
-- 1. Supprimer la policy qui expose les données sensibles aux anonymes
-- 2. Sécuriser toutes les fonctions SQL avec search_path
-- =====================================================

-- =====================================================
-- PARTIE 1: CORRIGER LA FUITE DE DONNÉES SUR PROFILES
-- =====================================================

-- Supprimer la policy dangereuse qui permet aux anonymes de voir TOUS les champs
DROP POLICY IF EXISTS "Anonymous can view public profiles" ON public.profiles;

-- =====================================================
-- PARTIE 2: SÉCURISER LES FONCTIONS SQL
-- =====================================================

-- Recréer assign_random_challenge avec search_path
CREATE OR REPLACE FUNCTION public.assign_random_challenge(p_user_id uuid, p_category text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_challenge_id UUID;
  v_target INTEGER;
  v_week_start DATE;
BEGIN
  v_week_start := get_current_week_start();
  
  SELECT c.id, c.target_value INTO v_challenge_id, v_target
  FROM challenges c
  WHERE c.category = p_category
    AND NOT EXISTS (
      SELECT 1 FROM user_challenges uc
      WHERE uc.user_id = p_user_id
        AND uc.challenge_id = c.id
        AND uc.week_start = v_week_start
        AND uc.status = 'active'
    )
  ORDER BY RANDOM()
  LIMIT 1;
  
  IF v_challenge_id IS NOT NULL THEN
    INSERT INTO user_challenges (user_id, challenge_id, target, week_start, progress, status)
    VALUES (p_user_id, v_challenge_id, v_target, v_week_start, 0, 'active');
  END IF;
  
  RETURN v_challenge_id;
END;
$$;

-- Recréer calculate_and_award_points avec search_path
CREATE OR REPLACE FUNCTION public.calculate_and_award_points(participant_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  points_total INTEGER := 0;
  gps_validated BOOLEAN;
  creator_validated BOOLEAN;
  user_reliability NUMERIC;
  participant_user_id UUID;
BEGIN
  SELECT user_id, confirmed_by_gps, confirmed_by_creator
  INTO participant_user_id, gps_validated, creator_validated
  FROM session_participants
  WHERE id = participant_id;
  
  IF creator_validated THEN
    points_total := points_total + 10;
  END IF;
  
  IF gps_validated THEN
    points_total := points_total + 10;
  END IF;
  
  IF gps_validated AND creator_validated THEN
    points_total := points_total + 5;
  END IF;
  
  SELECT reliability_rate INTO user_reliability
  FROM user_stats WHERE user_id = participant_user_id;
  
  IF user_reliability >= 90 THEN
    points_total := ROUND(points_total * 1.1);
  ELSIF user_reliability < 60 THEN
    points_total := ROUND(points_total * 0.9);
  END IF;
  
  UPDATE session_participants
  SET points_awarded = points_total, validation_status = 'validated'
  WHERE id = participant_id;
  
  IF points_total > 0 THEN
    PERFORM add_user_points(participant_user_id, points_total);
  END IF;
  
  UPDATE user_stats
  SET total_sessions_completed = total_sessions_completed + 1,
      reliability_rate = (total_sessions_completed::NUMERIC / GREATEST(1, total_sessions_joined)) * 100,
      updated_at = NOW()
  WHERE user_id = participant_user_id;
  
  RETURN points_total;
END;
$$;

-- Recréer check_and_award_badges avec search_path
CREATE OR REPLACE FUNCTION public.check_and_award_badges(user_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM session_participants sp
    JOIN sessions s ON sp.session_id = s.id
    WHERE sp.user_id = user_id_param
    AND sp.validation_status = 'validated'
    AND EXTRACT(HOUR FROM s.scheduled_at) < 8
  ) THEN
    INSERT INTO user_badges (user_id, badge_id, badge_name, badge_description, badge_icon)
    VALUES (user_id_param, 'morning_runner', 'Run du matin', 'Participer à une séance avant 8h', '🌅')
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;
  
  IF (SELECT streak_weeks FROM user_stats WHERE user_id = user_id_param) >= 5 THEN
    INSERT INTO user_badges (user_id, badge_id, badge_name, badge_description, badge_icon)
    VALUES (user_id_param, '5_week_streak', '5 semaines consécutives', 'Participer 5 semaines d''affilée', '🔥')
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;
  
  IF (SELECT total_sessions_completed FROM user_stats WHERE user_id = user_id_param) >= 10 THEN
    INSERT INTO user_badges (user_id, badge_id, badge_name, badge_description, badge_icon)
    VALUES (user_id_param, '10_sessions', '10 séances validées', 'Compléter 10 séances', '💪')
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;
END;
$$;

-- Recréer complete_challenge avec search_path
CREATE OR REPLACE FUNCTION public.complete_challenge(p_user_challenge_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_challenge_id UUID;
  v_category TEXT;
  v_reward_points INTEGER;
  v_week_start DATE;
BEGIN
  v_week_start := get_current_week_start();
  
  SELECT uc.user_id, uc.challenge_id, c.category, c.reward_points
  INTO v_user_id, v_challenge_id, v_category, v_reward_points
  FROM user_challenges uc
  JOIN challenges c ON uc.challenge_id = c.id
  WHERE uc.id = p_user_challenge_id;
  
  UPDATE user_challenges
  SET status = 'completed', completed_at = NOW()
  WHERE id = p_user_challenge_id;
  
  INSERT INTO challenge_history (user_id, challenge_id, week_start, reward_points)
  VALUES (v_user_id, v_challenge_id, v_week_start, v_reward_points);
  
  PERFORM add_user_points(v_user_id, v_reward_points);
  
  PERFORM assign_random_challenge(v_user_id, v_category);
END;
$$;

-- Recréer generate_club_code avec search_path
CREATE OR REPLACE FUNCTION public.generate_club_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Recréer generate_referral_code avec search_path
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Recréer get_common_clubs avec search_path
CREATE OR REPLACE FUNCTION public.get_common_clubs(user_1_id uuid, user_2_id uuid)
RETURNS TABLE (
  club_id uuid,
  club_name text,
  club_description text,
  club_avatar_url text,
  club_code text,
  created_by uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    c.id as club_id,
    c.group_name as club_name,
    c.group_description as club_description,
    c.group_avatar_url as club_avatar_url,
    c.club_code as club_code,
    c.created_by as created_by
  FROM conversations c
  JOIN group_members gm1 ON c.id = gm1.conversation_id AND gm1.user_id = user_1_id
  JOIN group_members gm2 ON c.id = gm2.conversation_id AND gm2.user_id = user_2_id
  WHERE c.is_group = true;
END;
$$;

-- Recréer get_current_week_start avec search_path
CREATE OR REPLACE FUNCTION public.get_current_week_start()
RETURNS date
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT date_trunc('week', CURRENT_DATE)::date;
$$;

-- Recréer get_follower_count avec search_path
CREATE OR REPLACE FUNCTION public.get_follower_count(profile_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM user_follows
  WHERE following_id = profile_user_id AND status = 'accepted';
$$;

-- Recréer get_following_count avec search_path
CREATE OR REPLACE FUNCTION public.get_following_count(profile_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM user_follows
  WHERE follower_id = profile_user_id AND status = 'accepted';
$$;

-- Recréer get_user_group_conversations avec search_path
CREATE OR REPLACE FUNCTION public.get_user_group_conversations(user_id_param uuid)
RETURNS TABLE(conversation_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT gm.conversation_id
  FROM group_members gm
  WHERE gm.user_id = user_id_param;
$$;

-- Recréer get_user_rank avec search_path
CREATE OR REPLACE FUNCTION public.get_user_rank(points integer)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN points >= 5000 THEN 'Légende'
    WHEN points >= 2500 THEN 'Expert'
    WHEN points >= 1000 THEN 'Confirmé'
    WHEN points >= 500 THEN 'Intermédiaire'
    WHEN points >= 100 THEN 'Débutant'
    ELSE 'Novice'
  END;
$$;

-- Recréer increment_challenge_progress avec search_path
CREATE OR REPLACE FUNCTION public.increment_challenge_progress(p_user_id uuid, p_validation_type text, p_increment integer DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_start DATE;
  v_challenge RECORD;
BEGIN
  v_week_start := get_current_week_start();
  
  FOR v_challenge IN
    SELECT uc.id, uc.progress, uc.target, c.reward_points
    FROM user_challenges uc
    JOIN challenges c ON uc.challenge_id = c.id
    WHERE uc.user_id = p_user_id
      AND uc.week_start = v_week_start
      AND uc.status = 'active'
      AND c.validation_type = p_validation_type
  LOOP
    UPDATE user_challenges
    SET progress = LEAST(progress + p_increment, target),
        updated_at = NOW()
    WHERE id = v_challenge.id;
    
    IF v_challenge.progress + p_increment >= v_challenge.target THEN
      PERFORM complete_challenge(v_challenge.id);
    END IF;
  END LOOP;
END;
$$;

-- Recréer increment_user_sessions_joined avec search_path
CREATE OR REPLACE FUNCTION public.increment_user_sessions_joined(user_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_stats (user_id, total_sessions_joined, total_sessions_completed, reliability_rate)
  VALUES (user_id_param, 1, 0, 100)
  ON CONFLICT (user_id)
  DO UPDATE SET
    total_sessions_joined = user_stats.total_sessions_joined + 1,
    updated_at = NOW();
END;
$$;

-- Recréer initialize_user_challenges avec search_path
CREATE OR REPLACE FUNCTION public.initialize_user_challenges(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_start DATE;
  v_existing_count INTEGER;
BEGIN
  v_week_start := get_current_week_start();
  
  SELECT COUNT(*) INTO v_existing_count
  FROM user_challenges
  WHERE user_id = p_user_id AND week_start = v_week_start;
  
  IF v_existing_count = 0 THEN
    PERFORM assign_random_challenge(p_user_id, 'participation');
    PERFORM assign_random_challenge(p_user_id, 'social');
    PERFORM assign_random_challenge(p_user_id, 'organizer');
  END IF;
END;
$$;

-- Recréer mark_absent_participants avec search_path
CREATE OR REPLACE FUNCTION public.mark_absent_participants()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE session_participants sp
  SET validation_status = 'absent'
  FROM sessions s
  WHERE sp.session_id = s.id
    AND s.scheduled_at < NOW() - INTERVAL '2 hours'
    AND sp.validation_status = 'pending'
    AND sp.confirmed_by_gps = false
    AND sp.confirmed_by_creator = false;
    
  UPDATE user_stats us
  SET total_sessions_absent = total_sessions_absent + 1,
      reliability_rate = GREATEST(0, (total_sessions_completed::NUMERIC / GREATEST(1, total_sessions_joined)) * 100),
      updated_at = NOW()
  FROM session_participants sp
  WHERE us.user_id = sp.user_id
    AND sp.validation_status = 'absent';
END;
$$;

-- Recréer process_referral avec search_path
CREATE OR REPLACE FUNCTION public.process_referral(referral_code_param text, new_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_user_id UUID;
BEGIN
  SELECT user_id INTO referrer_user_id
  FROM profiles
  WHERE referral_code = referral_code_param
  LIMIT 1;
  
  IF referrer_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  IF referrer_user_id = new_user_id THEN
    RETURN false;
  END IF;
  
  INSERT INTO referrals (referrer_id, referred_id, referral_code)
  VALUES (referrer_user_id, new_user_id, referral_code_param)
  ON CONFLICT DO NOTHING;
  
  PERFORM add_user_points(referrer_user_id, 50);
  PERFORM add_user_points(new_user_id, 25);
  
  UPDATE referrals
  SET reward_given = true
  WHERE referrer_id = referrer_user_id AND referred_id = new_user_id;
  
  RETURN true;
END;
$$;

-- Recréer trigger_season_reset avec search_path
CREATE OR REPLACE FUNCTION public.trigger_season_reset()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE user_scores
  SET seasonal_points = 0,
      last_seasonal_reset = NOW(),
      updated_at = NOW();
END;
$$;

-- Recréer accept_club_invitation avec search_path
CREATE OR REPLACE FUNCTION public.accept_club_invitation(invitation_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_club_id UUID;
  v_user_id UUID;
BEGIN
  SELECT club_id, invited_user_id INTO v_club_id, v_user_id
  FROM club_invitations
  WHERE id = invitation_id AND status = 'pending';
  
  IF v_club_id IS NULL THEN
    RETURN false;
  END IF;
  
  UPDATE club_invitations
  SET status = 'accepted', updated_at = NOW()
  WHERE id = invitation_id;
  
  INSERT INTO group_members (conversation_id, user_id, is_admin)
  VALUES (v_club_id, v_user_id, false)
  ON CONFLICT DO NOTHING;
  
  RETURN true;
END;
$$;

-- Recréer decline_club_invitation avec search_path
CREATE OR REPLACE FUNCTION public.decline_club_invitation(invitation_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE club_invitations
  SET status = 'declined', updated_at = NOW()
  WHERE id = invitation_id AND status = 'pending';
  
  RETURN FOUND;
END;
$$;

-- Recréer accept_follow_request avec search_path
CREATE OR REPLACE FUNCTION public.accept_follow_request(follow_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE user_follows
  SET status = 'accepted'
  WHERE id = follow_id AND following_id = auth.uid();
  
  RETURN FOUND;
END;
$$;

-- Recréer block_user avec search_path
CREATE OR REPLACE FUNCTION public.block_user(user_to_block_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO blocked_users (blocker_id, blocked_id)
  VALUES (auth.uid(), user_to_block_id)
  ON CONFLICT DO NOTHING;
  
  DELETE FROM user_follows
  WHERE (follower_id = auth.uid() AND following_id = user_to_block_id)
     OR (follower_id = user_to_block_id AND following_id = auth.uid());
  
  RETURN true;
END;
$$;

-- Recréer is_user_blocked avec search_path
CREATE OR REPLACE FUNCTION public.is_user_blocked(blocker_user_id uuid, blocked_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM blocked_users
    WHERE (blocker_id = blocker_user_id AND blocked_id = blocked_user_id)
       OR (blocker_id = blocked_user_id AND blocked_id = blocker_user_id)
  );
$$;

-- Recréer are_users_friends avec search_path
CREATE OR REPLACE FUNCTION public.are_users_friends(user1_id uuid, user2_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_follows
    WHERE follower_id = user1_id 
      AND following_id = user2_id 
      AND status = 'accepted'
  ) AND EXISTS (
    SELECT 1 FROM user_follows
    WHERE follower_id = user2_id 
      AND following_id = user1_id 
      AND status = 'accepted'
  );
$$;