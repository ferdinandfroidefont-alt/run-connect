-- Trigger pour les notifications de messages privés
CREATE OR REPLACE FUNCTION public.handle_new_message_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_profile RECORD;
  recipient_id UUID;
  conversation_info RECORD;
BEGIN
  -- Récupérer les infos de la conversation
  SELECT * INTO conversation_info
  FROM conversations 
  WHERE id = NEW.conversation_id;
  
  -- Vérifier si c'est un message privé (pas un groupe)
  IF conversation_info.is_group = true THEN
    RETURN NEW;
  END IF;
  
  -- Déterminer le destinataire (celui qui n'est pas l'expéditeur)
  IF conversation_info.participant_1 = NEW.sender_id THEN
    recipient_id := conversation_info.participant_2;
  ELSE
    recipient_id := conversation_info.participant_1;
  END IF;
  
  -- Vérifier que les utilisateurs sont amis
  IF NOT are_users_friends(NEW.sender_id, recipient_id) THEN
    RETURN NEW;
  END IF;
  
  -- Vérifier les préférences de notification du destinataire
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = recipient_id 
    AND notif_message = true
  ) THEN
    RETURN NEW;
  END IF;
  
  -- Récupérer les infos de l'expéditeur
  SELECT username, display_name, avatar_url 
  INTO sender_profile
  FROM profiles 
  WHERE user_id = NEW.sender_id;

  -- Créer la notification
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    recipient_id,
    'message',
    'Nouveau message',
    COALESCE(sender_profile.display_name, sender_profile.username, 'Quelqu''un') || ' vous a envoyé un message',
    jsonb_build_object(
      'sender_id', NEW.sender_id,
      'sender_name', COALESCE(sender_profile.display_name, sender_profile.username),
      'sender_avatar', sender_profile.avatar_url,
      'conversation_id', NEW.conversation_id,
      'message_id', NEW.id,
      'message_preview', LEFT(NEW.content, 100)
    )
  );

  RETURN NEW;
END;
$$;

-- Créer le trigger pour les nouveaux messages
CREATE TRIGGER trigger_new_message_notification
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_message_notification();

-- Trigger pour les notifications de sessions d'amis (Premium)
CREATE OR REPLACE FUNCTION public.handle_friend_session_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  organizer_profile RECORD;
  friend_record RECORD;
BEGIN
  -- Récupérer les infos de l'organisateur
  SELECT username, display_name, avatar_url 
  INTO organizer_profile
  FROM profiles 
  WHERE user_id = NEW.organizer_id;
  
  -- Parcourir tous les amis de l'organisateur
  FOR friend_record IN (
    SELECT DISTINCT 
      CASE 
        WHEN uf1.follower_id = NEW.organizer_id THEN uf1.following_id
        ELSE uf1.follower_id
      END as friend_id
    FROM user_follows uf1
    JOIN user_follows uf2 ON (
      (uf1.follower_id = NEW.organizer_id AND uf1.following_id = uf2.follower_id AND uf2.following_id = NEW.organizer_id) OR
      (uf1.following_id = NEW.organizer_id AND uf1.follower_id = uf2.following_id AND uf2.follower_id = NEW.organizer_id)
    )
    WHERE uf1.status = 'accepted' 
    AND uf2.status = 'accepted'
    AND (
      (uf1.follower_id = NEW.organizer_id AND uf1.following_id != NEW.organizer_id) OR
      (uf1.following_id = NEW.organizer_id AND uf1.follower_id != NEW.organizer_id)
    )
  ) LOOP
    
    -- Vérifier que l'ami est premium et a activé les notifications de sessions d'amis
    IF EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = friend_record.friend_id 
      AND p.is_premium = true
      AND p.notif_friend_session = true
    ) THEN
      
      -- Créer la notification pour l'ami
      INSERT INTO notifications (user_id, type, title, message, data)
      VALUES (
        friend_record.friend_id,
        'friend_session',
        'Session d''ami créée',
        COALESCE(organizer_profile.display_name, organizer_profile.username, 'Un ami') || 
        ' a créé une session: ' || NEW.title,
        jsonb_build_object(
          'session_id', NEW.id,
          'organizer_id', NEW.organizer_id,
          'organizer_name', COALESCE(organizer_profile.display_name, organizer_profile.username),
          'organizer_avatar', organizer_profile.avatar_url,
          'session_title', NEW.title,
          'session_type', NEW.activity_type,
          'scheduled_at', NEW.scheduled_at,
          'location_name', NEW.location_name
        )
      );
      
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Créer le trigger pour les nouvelles sessions
CREATE TRIGGER trigger_friend_session_notification
  AFTER INSERT ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_friend_session_notification();