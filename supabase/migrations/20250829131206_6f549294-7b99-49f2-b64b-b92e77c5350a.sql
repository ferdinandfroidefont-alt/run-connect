-- Étape 1: Renforcement des politiques RLS existantes

-- 1. Supprimer la politique trop permissive sur user_scores
DROP POLICY IF EXISTS "Scores are viewable by authenticated users" ON user_scores;

-- 2. Créer une nouvelle politique restrictive pour user_scores
CREATE POLICY "Users can view own scores only" 
ON user_scores FOR SELECT 
USING (auth.uid() = user_id);

-- 3. Renforcer la sécurité de la table subscribers avec des contraintes supplémentaires
ALTER TABLE subscribers ADD CONSTRAINT check_email_format 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- 4. Politique de sécurité renforcée pour la table subscribers
DROP POLICY IF EXISTS "subscribers_select_own_only" ON subscribers;
CREATE POLICY "subscribers_secure_select"
ON subscribers FOR SELECT
USING (
  user_id = auth.uid() 
  AND auth.uid() IS NOT NULL
  AND auth.jwt()->>'iss' = 'supabase'
);

-- 5. Politique de mise à jour encore plus restrictive pour subscribers
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

-- 6. Politique d'insertion sécurisée pour subscribers
DROP POLICY IF EXISTS "subscribers_insert_own_only" ON subscribers;
CREATE POLICY "subscribers_secure_insert"
ON subscribers FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND auth.uid() IS NOT NULL
  AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
);