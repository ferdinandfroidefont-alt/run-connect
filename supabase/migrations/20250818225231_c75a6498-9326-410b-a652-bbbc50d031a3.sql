-- Function to add or update user points
CREATE OR REPLACE FUNCTION public.add_user_points(user_id_param uuid, points_to_add integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert or update user score
  INSERT INTO public.user_scores (user_id, total_points, weekly_points, updated_at)
  VALUES (user_id_param, points_to_add, points_to_add, now())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    total_points = user_scores.total_points + points_to_add,
    weekly_points = user_scores.weekly_points + points_to_add,
    updated_at = now();
END;
$$;

-- Function to handle session creation rewards (+10 points)
CREATE OR REPLACE FUNCTION public.reward_session_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Add 10 points to the session organizer
  PERFORM add_user_points(NEW.organizer_id, 10);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to handle session participation rewards
CREATE OR REPLACE FUNCTION public.reward_session_participation()
RETURNS TRIGGER AS $$
DECLARE
  session_organizer_id uuid;
BEGIN
  -- Get the session organizer
  SELECT organizer_id INTO session_organizer_id
  FROM sessions 
  WHERE id = NEW.session_id;
  
  -- Add 30 points to the participant
  PERFORM add_user_points(NEW.user_id, 30);
  
  -- Add 50 points to the session organizer
  IF session_organizer_id IS NOT NULL THEN
    PERFORM add_user_points(session_organizer_id, 50);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for automatic point rewards
DROP TRIGGER IF EXISTS trigger_session_creation_reward ON sessions;
CREATE TRIGGER trigger_session_creation_reward
  AFTER INSERT ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION reward_session_creation();

DROP TRIGGER IF EXISTS trigger_session_participation_reward ON session_participants;
CREATE TRIGGER trigger_session_participation_reward
  AFTER INSERT ON session_participants
  FOR EACH ROW
  EXECUTE FUNCTION reward_session_participation();

-- Initialize scores for existing users who don't have any
INSERT INTO public.user_scores (user_id, total_points, weekly_points)
SELECT p.user_id, 0, 0
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM user_scores us WHERE us.user_id = p.user_id
);