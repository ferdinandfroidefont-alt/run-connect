-- Function to remove user points (with minimum 0 check)
CREATE OR REPLACE FUNCTION public.remove_user_points(user_id_param uuid, points_to_remove integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update user score, ensuring points don't go below 0
  UPDATE public.user_scores 
  SET 
    total_points = GREATEST(0, total_points - points_to_remove),
    weekly_points = GREATEST(0, weekly_points - points_to_remove),
    updated_at = now()
  WHERE user_id = user_id_param;
  
  -- If user doesn't exist in scores table, ignore (they had 0 points anyway)
END;
$$;

-- Function to handle session deletion (remove points)
CREATE OR REPLACE FUNCTION public.remove_session_points()
RETURNS TRIGGER AS $$
DECLARE
  participant_record RECORD;
  participant_count integer;
BEGIN
  -- Count participants who joined this session
  SELECT COUNT(*) INTO participant_count
  FROM session_participants 
  WHERE session_id = OLD.id;
  
  -- Remove 10 points from session organizer (creation points)
  PERFORM remove_user_points(OLD.organizer_id, 10);
  
  -- Remove points for each participant and organizer bonuses
  FOR participant_record IN 
    SELECT user_id FROM session_participants WHERE session_id = OLD.id
  LOOP
    -- Remove 30 points from participant
    PERFORM remove_user_points(participant_record.user_id, 30);
    
    -- Remove 50 points from organizer (bonus for this participant)
    PERFORM remove_user_points(OLD.organizer_id, 50);
  END LOOP;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to handle when someone leaves a session
CREATE OR REPLACE FUNCTION public.remove_participation_points()
RETURNS TRIGGER AS $$
DECLARE
  session_organizer_id uuid;
BEGIN
  -- Get the session organizer
  SELECT organizer_id INTO session_organizer_id
  FROM sessions 
  WHERE id = OLD.session_id;
  
  -- Remove 30 points from the participant who left
  PERFORM remove_user_points(OLD.user_id, 30);
  
  -- Remove 50 points from the session organizer
  IF session_organizer_id IS NOT NULL THEN
    PERFORM remove_user_points(session_organizer_id, 50);
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for session deletion
DROP TRIGGER IF EXISTS trigger_session_deletion_points ON sessions;
CREATE TRIGGER trigger_session_deletion_points
  BEFORE DELETE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION remove_session_points();

-- Create trigger for participant leaving
DROP TRIGGER IF EXISTS trigger_participant_leaving_points ON session_participants;
CREATE TRIGGER trigger_participant_leaving_points
  BEFORE DELETE ON session_participants
  FOR EACH ROW
  EXECUTE FUNCTION remove_participation_points();