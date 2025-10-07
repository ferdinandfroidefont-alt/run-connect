-- Phase 2 & 3: Système de notifications push automatiques

-- 1. Activer l'extension pg_net pour les appels HTTP asynchrones
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2. Créer la fonction qui envoie les notifications push via l'Edge Function
CREATE OR REPLACE FUNCTION public.send_push_notification_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_id bigint;
BEGIN
  -- Appel asynchrone à l'Edge Function send-push-notification
  SELECT extensions.http_post(
    url := 'https://dbptgehpknjsoisirviz.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRicHRnZWhwa25qc29pc2lydml6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NjIxNDUsImV4cCI6MjA3MDIzODE0NX0.D1uw0ui_auBAi-dvodv6j2a9x3lvMnY69cDa9Wupjcs'
    ),
    body := jsonb_build_object(
      'user_id', NEW.user_id::text,
      'title', NEW.title,
      'body', NEW.message,
      'type', NEW.type,
      'data', NEW.data
    )
  ) INTO request_id;
  
  RETURN NEW;
END;
$$;

-- 3. Créer le trigger principal sur la table notifications
DROP TRIGGER IF EXISTS auto_send_push_notification ON public.notifications;
CREATE TRIGGER auto_send_push_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.send_push_notification_on_insert();

-- 4. Améliorer le trigger de demande de suivi (s'assurer qu'il crée bien une notification)
CREATE OR REPLACE FUNCTION public.handle_follow_request_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  follower_profile RECORD;
BEGIN
  -- Récupérer les infos du follower
  SELECT username, display_name, avatar_url 
  INTO follower_profile
  FROM public.profiles 
  WHERE user_id = NEW.follower_id;
  
  -- Créer la notification pour l'utilisateur suivi
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    NEW.following_id,
    'follow_request',
    'Nouvelle demande de suivi',
    COALESCE(follower_profile.display_name, follower_profile.username, 'Quelqu''un') || ' souhaite vous suivre',
    jsonb_build_object(
      'follow_id', NEW.id,
      'follower_id', NEW.follower_id,
      'follower_name', COALESCE(follower_profile.display_name, follower_profile.username),
      'follower_avatar', follower_profile.avatar_url
    )
  );
  
  RETURN NEW;
END;
$$;

-- 5. Créer le trigger pour les demandes de suivi (si pas déjà existant)
DROP TRIGGER IF EXISTS trigger_follow_request_notification ON public.user_follows;
CREATE TRIGGER trigger_follow_request_notification
  AFTER INSERT ON public.user_follows
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION public.handle_follow_request_notification();

-- 6. Créer le trigger pour les demandes de participation aux sessions
CREATE OR REPLACE FUNCTION public.handle_session_request_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requester_profile RECORD;
  session_info RECORD;
BEGIN
  -- Récupérer les infos du demandeur
  SELECT username, display_name, avatar_url 
  INTO requester_profile
  FROM public.profiles 
  WHERE user_id = NEW.user_id;
  
  -- Récupérer les infos de la session
  SELECT title, organizer_id, activity_type, location_name, scheduled_at
  INTO session_info
  FROM public.sessions 
  WHERE id = NEW.session_id;
  
  -- Si pas de session trouvée, sortir
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  
  -- Vérifier les préférences de notification de l'organisateur
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = session_info.organizer_id 
    AND notif_session_request = true
  ) THEN
    RETURN NEW;
  END IF;
  
  -- Créer la notification pour l'organisateur
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    session_info.organizer_id,
    'session_request',
    'Demande de participation',
    COALESCE(requester_profile.display_name, requester_profile.username, 'Quelqu''un') || 
    ' demande à rejoindre votre session: ' || session_info.title,
    jsonb_build_object(
      'session_id', NEW.session_id,
      'requester_id', NEW.user_id,
      'requester_name', COALESCE(requester_profile.display_name, requester_profile.username),
      'requester_avatar', requester_profile.avatar_url,
      'session_title', session_info.title,
      'session_type', session_info.activity_type,
      'scheduled_at', session_info.scheduled_at,
      'location_name', session_info.location_name
    )
  );
  
  RETURN NEW;
END;
$$;

-- 7. Créer le trigger pour les demandes de session
DROP TRIGGER IF EXISTS trigger_session_request_notification ON public.session_requests;
CREATE TRIGGER trigger_session_request_notification
  AFTER INSERT ON public.session_requests
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION public.handle_session_request_notification();

-- Phase 5: Table de monitoring des notifications push
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  push_token TEXT,
  fcm_success BOOLEAN,
  fcm_error TEXT,
  fcm_response JSONB,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour améliorer les requêtes de monitoring
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON public.notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON public.notification_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_success ON public.notification_logs(fcm_success);

-- RLS pour la table de logs (admin seulement)
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view notification logs"
  ON public.notification_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Commentaires pour documentation
COMMENT ON TABLE public.notification_logs IS 'Logs des notifications push envoyées via FCM pour monitoring et debug';
COMMENT ON COLUMN public.notification_logs.fcm_success IS 'true si FCM a accepté la notification, false si erreur';
COMMENT ON COLUMN public.notification_logs.fcm_error IS 'Message d''erreur FCM si échec';
COMMENT ON COLUMN public.notification_logs.fcm_response IS 'Réponse complète de FCM pour debug';