-- Activer l'extension pg_net si elle n'est pas déjà activée
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Fonction qui appelle automatiquement l'Edge Function send-push-notification
-- Dès qu'une notification est créée dans la table notifications
CREATE OR REPLACE FUNCTION public.trigger_send_push_on_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  service_role_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRicHRnZWhwa25qc29pc2lydml6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDY2MjE0NSwiZXhwIjoyMDcwMjM4MTQ1fQ.qJD3mJ_Y8QcqHNQxGXqH-_cLQs0z8UwqKGvX0rJ0h6E';
BEGIN
  -- Appeler l'Edge Function send-push-notification via pg_net (HTTP POST)
  PERFORM net.http_post(
    url := 'https://dbptgehpknjsoisirviz.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := jsonb_build_object(
      'user_id', NEW.user_id,
      'title', NEW.title,
      'body', NEW.message,
      'type', NEW.type,
      'data', NEW.data
    )
  );
  
  RETURN NEW;
END;
$$;

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS auto_push_notification_trigger ON public.notifications;

-- Créer le trigger automatique sur INSERT dans notifications
-- Ce trigger s'exécute APRÈS chaque insertion d'une notification
-- Il appelle automatiquement send-push-notification pour envoyer le push
CREATE TRIGGER auto_push_notification_trigger
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_send_push_on_notification();