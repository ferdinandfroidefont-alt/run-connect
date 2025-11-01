-- Supprimer le trigger obsolète qui appelle net.http_post()
DROP TRIGGER IF EXISTS auto_push_notification_trigger ON notifications;

-- Supprimer la fonction obsolète
DROP FUNCTION IF EXISTS send_push_notification_trigger() CASCADE;

-- Vérifier et supprimer tout autre trigger lié
DROP TRIGGER IF EXISTS trigger_send_push_notification ON notifications;