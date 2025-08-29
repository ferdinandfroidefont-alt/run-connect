-- Étape 2: Systèmes d'audit et de surveillance

-- 1. Créer une table d'audit pour tracer les accès aux données sensibles
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  table_name TEXT NOT NULL,
  action TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  details JSONB
);

-- 2. Activer RLS sur la table d'audit
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- 3. Politique pour la table d'audit (seuls les admins peuvent voir)
CREATE POLICY "Admin only audit access"
ON audit_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
);

-- 4. Fonction pour anonymiser les données en cas de suppression de compte
CREATE OR REPLACE FUNCTION anonymize_user_data(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Anonymiser les données dans subscribers
  UPDATE subscribers 
  SET 
    email = 'deleted_' || id::text || '@anonymized.local',
    stripe_customer_id = NULL
  WHERE user_id = target_user_id;
  
  -- Anonymiser les données dans profiles
  UPDATE profiles 
  SET 
    username = 'deleted_' || id::text,
    display_name = 'Utilisateur supprimé',
    bio = NULL,
    phone = NULL,
    avatar_url = NULL,
    push_token = NULL,
    strava_access_token = NULL,
    strava_refresh_token = NULL,
    instagram_access_token = NULL
  WHERE user_id = target_user_id;
END;
$$;

-- 5. Contrainte de sécurité : empêcher la modification des user_id
CREATE OR REPLACE FUNCTION prevent_user_id_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.user_id != NEW.user_id THEN
    RAISE EXCEPTION 'user_id cannot be modified for security reasons';
  END IF;
  RETURN NEW;
END;
$$;

-- 6. Appliquer la contrainte aux tables critiques
CREATE TRIGGER prevent_user_id_change_subscribers
  BEFORE UPDATE ON subscribers
  FOR EACH ROW
  EXECUTE FUNCTION prevent_user_id_change();

CREATE TRIGGER prevent_user_id_change_profiles
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_user_id_change();