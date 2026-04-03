-- Activer l'extension pg_net si elle n'est pas déjà activée
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Version historique : ne plus embarquer de secret. La logique active lit Vault (migration 20260402140000).
CREATE OR REPLACE FUNCTION public.trigger_send_push_on_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NEW;
END;
$$;

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS auto_push_notification_trigger ON public.notifications;

-- Créer le trigger automatique sur INSERT dans notifications
CREATE TRIGGER auto_push_notification_trigger
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_send_push_on_notification();
