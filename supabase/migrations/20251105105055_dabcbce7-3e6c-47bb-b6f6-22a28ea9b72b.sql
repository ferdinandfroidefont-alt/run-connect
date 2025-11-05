-- Supprimer TOUS les triggers de notifications push obsolètes
DROP TRIGGER IF EXISTS auto_push_notification_trigger ON notifications CASCADE;
DROP TRIGGER IF EXISTS trigger_send_push_notification ON notifications CASCADE;
DROP TRIGGER IF EXISTS send_notification_on_insert ON notifications CASCADE;
DROP TRIGGER IF EXISTS handle_test_push_notification_trigger ON notifications CASCADE;

-- Supprimer les fonctions trigger obsolètes
DROP FUNCTION IF EXISTS send_push_notification_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.send_push_notification_trigger() CASCADE;
DROP FUNCTION IF EXISTS notify_on_insert() CASCADE;
DROP FUNCTION IF EXISTS public.trigger_send_push_notification() CASCADE;
DROP FUNCTION IF EXISTS public.handle_test_push_notification() CASCADE;

-- Vérifier que l'extension pg_net est installée (pour usage futur si besoin)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;