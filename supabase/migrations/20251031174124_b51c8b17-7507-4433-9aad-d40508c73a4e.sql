-- 1. Supprimer le trigger et la fonction obsolète avec CASCADE
DROP TRIGGER IF EXISTS auto_push_notification_trigger ON notifications;
DROP FUNCTION IF EXISTS trigger_send_push_on_notification() CASCADE;

-- 2. Ajouter une contrainte unique pour éviter les doublons de notifications
DO $$ 
BEGIN
  ALTER TABLE notifications 
  ADD CONSTRAINT unique_notification_per_user_type_time 
  UNIQUE (user_id, type, created_at);
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN others THEN NULL;
END $$;

-- 3. Ajouter un index pour optimiser les requêtes de déduplication
CREATE INDEX IF NOT EXISTS idx_notifications_user_type_created 
ON notifications (user_id, type, created_at DESC);

-- 4. Ajouter une colonne pour tracker la date du dernier token push
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS push_token_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 5. Créer un trigger pour mettre à jour push_token_updated_at automatiquement
CREATE OR REPLACE FUNCTION update_push_token_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.push_token IS DISTINCT FROM OLD.push_token AND NEW.push_token IS NOT NULL THEN
    NEW.push_token_updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_update_push_token_timestamp ON profiles;
CREATE TRIGGER trigger_update_push_token_timestamp
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_push_token_timestamp();