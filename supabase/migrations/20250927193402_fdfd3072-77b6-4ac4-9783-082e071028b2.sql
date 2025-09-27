-- Trigger pour les notifications d'acceptation de session
CREATE OR REPLACE FUNCTION public.handle_session_acceptance_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  organizer_profile RECORD;
  participant_profile RECORD;
  session_info RECORD;
BEGIN
  -- Récupérer les infos de la session
  SELECT title, organizer_id, activity_type, location_name, scheduled_at
  INTO session_info
  FROM sessions 
  WHERE id = NEW.session_id;
  
  -- Si pas de session trouvée, sortir
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  
  -- Récupérer les infos de l'organisateur
  SELECT username, display_name, avatar_url 
  INTO organizer_profile
  FROM profiles 
  WHERE user_id = session_info.organizer_id;
  
  -- Récupérer les infos du participant
  SELECT username, display_name, avatar_url 
  INTO participant_profile
  FROM profiles 
  WHERE user_id = NEW.user_id;
  
  -- Vérifier les préférences de notification de l'organisateur pour les demandes de session
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = session_info.organizer_id 
    AND notif_session_request = true
  ) THEN
    RETURN NEW;
  END IF;

  -- Créer la notification pour l'organisateur
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    session_info.organizer_id,
    'session_accepted',
    'Session acceptée',
    COALESCE(participant_profile.display_name, participant_profile.username, 'Quelqu''un') || 
    ' a rejoint votre session: ' || session_info.title,
    jsonb_build_object(
      'session_id', NEW.session_id,
      'participant_id', NEW.user_id,
      'participant_name', COALESCE(participant_profile.display_name, participant_profile.username),
      'participant_avatar', participant_profile.avatar_url,
      'session_title', session_info.title,
      'session_type', session_info.activity_type,
      'scheduled_at', session_info.scheduled_at,
      'location_name', session_info.location_name
    )
  );

  RETURN NEW;
END;
$$;

-- Créer le trigger pour les nouvelles participations aux sessions
CREATE TRIGGER trigger_session_acceptance_notification
  AFTER INSERT ON public.session_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_session_acceptance_notification();