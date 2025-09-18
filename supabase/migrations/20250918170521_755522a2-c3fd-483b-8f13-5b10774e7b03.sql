-- Ajouter des triggers pour envoyer des notifications push automatiquement

-- 1. Fonction pour envoyer une notification push
CREATE OR REPLACE FUNCTION send_push_notification_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Appeler la fonction Edge pour envoyer la notification push
  PERFORM net.http_post(
    url := 'https://dbptgehpknjsoisirviz.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('request.jwt.claims', true)::json->>'anon_key'
    ),
    body := jsonb_build_object(
      'user_id', NEW.user_id,
      'title', NEW.title,
      'body', NEW.message,
      'type', NEW.type,
      'data', NEW.data
    )::text
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger sur les notifications pour envoyer les push
DROP TRIGGER IF EXISTS push_notification_trigger ON notifications;
CREATE TRIGGER push_notification_trigger
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION send_push_notification_trigger();

-- 3. Fonction pour créer et envoyer notification de message
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  sender_profile profiles%ROWTYPE;
  recipient_id UUID;
BEGIN
  -- Récupérer le profil de l'expéditeur
  SELECT * INTO sender_profile 
  FROM profiles 
  WHERE user_id = NEW.sender_id;

  -- Pour les messages de conversation, notifier tous les participants sauf l'expéditeur
  IF NEW.conversation_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, data)
    SELECT 
      cp.user_id,
      'Nouveau message',
      COALESCE(sender_profile.display_name, sender_profile.username, 'Quelqu''un') || ': ' || 
      CASE 
        WHEN LENGTH(NEW.content) > 50 THEN LEFT(NEW.content, 50) || '...'
        ELSE NEW.content
      END,
      'message',
      jsonb_build_object(
        'conversation_id', NEW.conversation_id,
        'message_id', NEW.id,
        'sender_id', NEW.sender_id,
        'sender_name', COALESCE(sender_profile.display_name, sender_profile.username),
        'sender_avatar', sender_profile.avatar_url
      )
    FROM conversation_participants cp
    WHERE cp.conversation_id = NEW.conversation_id 
    AND cp.user_id != NEW.sender_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger sur les messages
DROP TRIGGER IF EXISTS notify_message_trigger ON messages;
CREATE TRIGGER notify_message_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();

-- 5. Fonction pour notifier les demandes de séance
CREATE OR REPLACE FUNCTION notify_session_request()
RETURNS TRIGGER AS $$
DECLARE
  session_owner_id UUID;
  session_title TEXT;
  requester_profile profiles%ROWTYPE;
BEGIN
  -- Récupérer le propriétaire de la séance
  SELECT user_id, title INTO session_owner_id, session_title
  FROM sessions 
  WHERE id = NEW.session_id;

  -- Récupérer le profil du demandeur
  SELECT * INTO requester_profile
  FROM profiles 
  WHERE user_id = NEW.user_id;

  -- Créer la notification pour le propriétaire de la séance
  INSERT INTO notifications (user_id, title, message, type, data)
  VALUES (
    session_owner_id,
    'Demande de participation',
    COALESCE(requester_profile.display_name, requester_profile.username, 'Quelqu''un') || 
    ' souhaite rejoindre votre séance "' || session_title || '"',
    'session_request',
    jsonb_build_object(
      'session_id', NEW.session_id,
      'request_user_id', NEW.user_id,
      'requester_name', COALESCE(requester_profile.display_name, requester_profile.username),
      'requester_avatar', requester_profile.avatar_url,
      'session_title', session_title
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger sur les demandes de séance
DROP TRIGGER IF EXISTS notify_session_request_trigger ON session_requests;
CREATE TRIGGER notify_session_request_trigger
  AFTER INSERT ON session_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_session_request();

-- 7. Fonction pour notifier l'acceptation de demandes
CREATE OR REPLACE FUNCTION notify_request_accepted()
RETURNS TRIGGER AS $$
DECLARE
  session_title TEXT;
  owner_profile profiles%ROWTYPE;
BEGIN
  -- Seulement si le statut passe à 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    
    -- Récupérer les infos de la séance et du propriétaire
    SELECT s.title, p.* INTO session_title, owner_profile
    FROM sessions s
    JOIN profiles p ON p.user_id = s.user_id
    WHERE s.id = NEW.session_id;

    -- Notifier le demandeur que sa demande a été acceptée
    INSERT INTO notifications (user_id, title, message, type, data)
    VALUES (
      NEW.user_id,
      'Demande acceptée !',
      'Votre demande pour rejoindre "' || session_title || '" a été acceptée',
      'request_accepted',
      jsonb_build_object(
        'session_id', NEW.session_id,
        'session_title', session_title,
        'owner_name', COALESCE(owner_profile.display_name, owner_profile.username),
        'owner_avatar', owner_profile.avatar_url
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Trigger pour les acceptations de demandes
DROP TRIGGER IF EXISTS notify_request_accepted_trigger ON session_requests;
CREATE TRIGGER notify_request_accepted_trigger
  AFTER UPDATE ON session_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_request_accepted();

-- 9. Activer les notifications en temps réel
ALTER TABLE notifications REPLICA IDENTITY FULL;
ALTER TABLE messages REPLICA IDENTITY FULL;
ALTER TABLE session_requests REPLICA IDENTITY FULL;

-- Ajouter les tables à la publication realtime
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE session_requests;