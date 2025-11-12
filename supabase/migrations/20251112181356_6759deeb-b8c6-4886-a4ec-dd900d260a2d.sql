-- 🔥 NIVEAU 26: Supprimer le trigger obsolète qui bloque les notifications

-- 1. Supprimer TOUS les triggers possibles sur la table notifications
DROP TRIGGER IF EXISTS trigger_send_push_notification_on_insert ON public.notifications;
DROP TRIGGER IF EXISTS on_notification_created ON public.notifications;
DROP TRIGGER IF EXISTS send_push_on_notification ON public.notifications;
DROP TRIGGER IF EXISTS on_notification_insert ON public.notifications;

-- 2. Supprimer la fonction trigger obsolète avec CASCADE pour être sûr
DROP FUNCTION IF EXISTS public.trigger_send_push_notification() CASCADE;

-- 3. Ajouter un commentaire pour documentation
COMMENT ON TABLE public.notifications IS 'Table des notifications. Les notifications push sont envoyées directement via l''edge function send-push-notification, pas via un trigger.';