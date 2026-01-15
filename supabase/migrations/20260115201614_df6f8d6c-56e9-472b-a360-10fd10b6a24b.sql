-- =====================================================
-- MIGRATION SÉCURITÉ - PARTIE 2
-- Sécuriser les 8 fonctions restantes avec search_path
-- =====================================================

-- Recréer create_user_stats avec search_path
CREATE OR REPLACE FUNCTION public.create_user_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_stats (user_id) VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Recréer detect_suspicious_patterns avec search_path
CREATE OR REPLACE FUNCTION public.detect_suspicious_patterns()
RETURNS TABLE(user_id uuid, reason text, details jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT 
    sp1.user_id, 
    'same_gps_exact'::TEXT,
    jsonb_build_object('other_user', sp2.user_id, 'session_id', sp1.session_id)
  FROM session_participants sp1
  JOIN session_participants sp2 ON sp1.session_id = sp2.session_id
  WHERE sp1.user_id != sp2.user_id
  AND sp1.gps_lat = sp2.gps_lat AND sp1.gps_lng = sp2.gps_lng
  AND sp1.confirmed_by_gps = true AND sp2.confirmed_by_gps = true
  
  UNION
  
  SELECT DISTINCT sp1.user_id, 'same_device_multiple_accounts'::TEXT,
    jsonb_build_object('device_id', sp1.device_id)
  FROM session_participants sp1
  WHERE sp1.device_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM session_participants sp2
    WHERE sp2.device_id = sp1.device_id AND sp2.user_id != sp1.user_id
  );
END;
$$;

-- Recréer validate_friend_challenges avec search_path
CREATE OR REPLACE FUNCTION public.validate_friend_challenges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    PERFORM increment_challenge_progress(NEW.follower_id, 'add_friend', 1);
  END IF;
  RETURN NEW;
END;
$$;

-- Recréer validate_join_club_challenges avec search_path
CREATE OR REPLACE FUNCTION public.validate_join_club_challenges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM increment_challenge_progress(NEW.user_id, 'join_club', 1);
  END IF;
  RETURN NEW;
END;
$$;

-- Recréer validate_message_challenges avec search_path
CREATE OR REPLACE FUNCTION public.validate_message_challenges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.message_type = 'text' THEN
      PERFORM increment_challenge_progress(NEW.sender_id, 'send_message', 1);
    END IF;
    
    IF NEW.message_type = 'voice' THEN
      PERFORM increment_challenge_progress(NEW.sender_id, 'send_voice', 1);
    END IF;
    
    IF NEW.message_type = 'image' THEN
      PERFORM increment_challenge_progress(NEW.sender_id, 'send_photo', 1);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Recréer validate_referral_challenges avec search_path
CREATE OR REPLACE FUNCTION public.validate_referral_challenges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM increment_challenge_progress(NEW.referrer_id, 'refer_friend', 1);
  END IF;
  RETURN NEW;
END;
$$;

-- Recréer validate_session_creation_challenges avec search_path
CREATE OR REPLACE FUNCTION public.validate_session_creation_challenges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM increment_challenge_progress(NEW.organizer_id, 'session_creation', 1);
  END IF;
  RETURN NEW;
END;
$$;

-- Recréer validate_session_participation_challenges avec search_path
CREATE OR REPLACE FUNCTION public.validate_session_participation_challenges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.confirmed_by_creator = true AND (OLD.confirmed_by_creator IS NULL OR OLD.confirmed_by_creator = false) THEN
    PERFORM increment_challenge_progress(NEW.user_id, 'session_participation', 1);
  END IF;
  RETURN NEW;
END;
$$;