-- Supprimer le trigger pg_net défectueux qui n'envoie pas les notifications
-- Ce trigger sera remplacé par un système Realtime côté frontend plus fiable

DROP TRIGGER IF EXISTS auto_send_push_notification ON public.notifications;
DROP FUNCTION IF EXISTS public.send_push_notification_on_insert();

-- Les triggers de création de notification (handle_new_message_notification, etc.)
-- continueront à créer des notifications dans la table
-- Le nouveau hook useNotificationRealtimeSync écoutera ces INSERT via Realtime
-- et appellera directement l'Edge Function send-push-notification depuis le frontend