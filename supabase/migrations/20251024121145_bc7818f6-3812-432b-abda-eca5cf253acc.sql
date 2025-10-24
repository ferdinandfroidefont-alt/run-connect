-- Phase 1: Restructurer session_participants avec système de validation
ALTER TABLE session_participants 
ADD COLUMN IF NOT EXISTS confirmed_by_creator BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS confirmed_by_gps BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS gps_validation_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS gps_lat NUMERIC,
ADD COLUMN IF NOT EXISTS gps_lng NUMERIC,
ADD COLUMN IF NOT EXISTS device_id TEXT,
ADD COLUMN IF NOT EXISTS points_awarded INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'pending';

-- Phase 2: Créer table user_stats
CREATE TABLE IF NOT EXISTS user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE UNIQUE,
  total_sessions_joined INTEGER DEFAULT 0,
  total_sessions_completed INTEGER DEFAULT 0,
  total_sessions_absent INTEGER DEFAULT 0,
  reliability_rate NUMERIC DEFAULT 100.0,
  streak_weeks INTEGER DEFAULT 0,
  last_streak_update TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own stats" ON user_stats 
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats" ON user_stats 
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Initialiser les stats pour utilisateurs existants
INSERT INTO user_stats (user_id)
SELECT user_id FROM profiles
ON CONFLICT (user_id) DO NOTHING;

-- Trigger pour créer automatiquement user_stats
CREATE OR REPLACE FUNCTION create_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_stats (user_id) VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_create_user_stats ON profiles;
CREATE TRIGGER trigger_create_user_stats
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_user_stats();

-- Phase 3: Désactiver triggers automatiques
DROP TRIGGER IF EXISTS trigger_session_participation_reward ON session_participants;
DROP TRIGGER IF EXISTS trigger_session_creation_reward ON sessions;

-- Phase 4: Fonction de calcul intelligent des points
CREATE OR REPLACE FUNCTION calculate_and_award_points(participant_id UUID)
RETURNS INTEGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Phase 5: Fonction pour marquer absents
CREATE OR REPLACE FUNCTION mark_absent_participants()
RETURNS void AS $$
BEGIN
  WITH absent_participants AS (
    UPDATE session_participants
    SET validation_status = 'absent', points_awarded = -10
    WHERE session_id IN (
      SELECT id FROM sessions 
      WHERE scheduled_at < NOW() - INTERVAL '2 hours'
      AND scheduled_at > NOW() - INTERVAL '7 days'
    )
    AND confirmed_by_creator = false
    AND confirmed_by_gps = false
    AND validation_status = 'pending'
    RETURNING user_id
  )
  UPDATE user_scores
  SET total_points = GREATEST(0, total_points - 10),
      seasonal_points = GREATEST(0, seasonal_points - 10),
      weekly_points = GREATEST(0, weekly_points - 10)
  WHERE user_id IN (SELECT user_id FROM absent_participants);
  
  UPDATE user_stats
  SET total_sessions_absent = total_sessions_absent + 1,
      reliability_rate = (total_sessions_completed::NUMERIC / GREATEST(1, total_sessions_joined)) * 100,
      updated_at = NOW()
  WHERE user_id IN (SELECT user_id FROM absent_participants);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Phase 6: Fonction anti-fraude
CREATE OR REPLACE FUNCTION detect_suspicious_patterns()
RETURNS TABLE(user_id UUID, reason TEXT, details JSONB) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper pour incrémenter sessions rejointes
CREATE OR REPLACE FUNCTION increment_user_sessions_joined(user_id_param UUID)
RETURNS void AS $$
BEGIN
  UPDATE user_stats
  SET total_sessions_joined = total_sessions_joined + 1, updated_at = NOW()
  WHERE user_id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Phase 7: Table badges
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  badge_description TEXT,
  badge_icon TEXT,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own badges" ON user_badges 
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Fonction pour attribuer badges
CREATE OR REPLACE FUNCTION check_and_award_badges(user_id_param UUID)
RETURNS void AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;