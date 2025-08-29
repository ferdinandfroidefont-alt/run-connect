-- Sécurisation renforcée de la base de données

-- 1. Supprimer la politique trop permissive sur user_scores
DROP POLICY IF EXISTS "Scores are viewable by authenticated users" ON user_scores;

-- 2. Créer une nouvelle politique restrictive pour user_scores
CREATE POLICY "Users can view own scores only" 
ON user_scores FOR SELECT 
USING (auth.uid() = user_id);

-- 3. Renforcer la sécurité de la table subscribers avec des contraintes supplémentaires
ALTER TABLE subscribers ADD CONSTRAINT check_email_format 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- 4. Ajouter une fonction de chiffrement pour les données sensibles
CREATE OR REPLACE FUNCTION encrypt_sensitive_data(data TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Utiliser pgcrypto pour chiffrer les données sensibles
  RETURN encode(digest(data, 'sha256'), 'hex');
END;
$$;

-- 5. Créer une table d'audit pour tracer les accès aux données sensibles
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  table_name TEXT NOT NULL,
  action TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ip_address INET,
  user_agent TEXT
);

-- 6. Activer RLS sur la table d'audit
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- 7. Politique pour la table d'audit (seuls les admins peuvent voir)
CREATE POLICY "Admin only audit access"
ON audit_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
);

-- 8. Fonction de trigger pour l'audit des accès aux données sensibles
CREATE OR REPLACE FUNCTION audit_sensitive_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Enregistrer l'accès aux données sensibles
  INSERT INTO audit_log (user_id, table_name, action)
  VALUES (auth.uid(), TG_TABLE_NAME, TG_OP);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 9. Créer des triggers d'audit pour les tables sensibles
CREATE TRIGGER audit_subscribers_access
  AFTER SELECT ON subscribers
  FOR EACH ROW
  EXECUTE FUNCTION audit_sensitive_access();

CREATE TRIGGER audit_profiles_access
  AFTER SELECT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION audit_sensitive_access();

-- 10. Politique de sécurité renforcée pour la table subscribers
DROP POLICY IF EXISTS "subscribers_select_own_only" ON subscribers;
CREATE POLICY "subscribers_secure_select"
ON subscribers FOR SELECT
USING (
  user_id = auth.uid() 
  AND auth.uid() IS NOT NULL
  AND auth.jwt()->>'iss' = 'supabase'
);

-- 11. Politique de mise à jour encore plus restrictive pour subscribers
DROP POLICY IF EXISTS "subscribers_update_own_only" ON subscribers;
CREATE POLICY "subscribers_secure_update"
ON subscribers FOR UPDATE
USING (
  user_id = auth.uid() 
  AND auth.uid() IS NOT NULL
  AND auth.jwt()->>'iss' = 'supabase'
)
WITH CHECK (
  user_id = auth.uid()
  AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- 12. Politique d'insertion sécurisée pour subscribers
DROP POLICY IF EXISTS "subscribers_insert_own_only" ON subscribers;
CREATE POLICY "subscribers_secure_insert"
ON subscribers FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND auth.uid() IS NOT NULL
  AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- 13. Fonction pour anonymiser les données en cas de suppression de compte
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

-- 14. Contrainte de sécurité : empêcher la modification des user_id
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

-- 15. Appliquer la contrainte aux tables critiques
CREATE TRIGGER prevent_user_id_change_subscribers
  BEFORE UPDATE ON subscribers
  FOR EACH ROW
  EXECUTE FUNCTION prevent_user_id_change();

CREATE TRIGGER prevent_user_id_change_profiles
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_user_id_change();