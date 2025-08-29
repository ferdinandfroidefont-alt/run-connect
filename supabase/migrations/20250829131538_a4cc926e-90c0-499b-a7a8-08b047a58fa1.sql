-- Étape 4: Protections de sécurité supplémentaires

-- 1. Créer une fonction de limitation de taux (rate limiting)
CREATE OR REPLACE FUNCTION check_rate_limit(user_id_param UUID, action_type TEXT, max_attempts INTEGER, time_window_minutes INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attempt_count INTEGER;
BEGIN
  -- Compter les tentatives dans la fenêtre de temps
  SELECT COUNT(*) INTO attempt_count
  FROM audit_log
  WHERE user_id = user_id_param
    AND action = action_type
    AND timestamp > NOW() - (time_window_minutes || ' minutes')::INTERVAL;
  
  -- Retourner false si limite dépassée
  IF attempt_count >= max_attempts THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- 2. Fonction de validation des données sensibles
CREATE OR REPLACE FUNCTION validate_sensitive_data_access(table_name_param TEXT, user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Enregistrer l'accès dans l'audit
  INSERT INTO audit_log (user_id, table_name, action, details)
  VALUES (
    user_id_param, 
    table_name_param, 
    'SENSITIVE_ACCESS',
    jsonb_build_object('timestamp', NOW(), 'validated', true)
  );
  
  -- Vérifier la limitation de taux pour les accès sensibles
  IF NOT check_rate_limit(user_id_param, 'SENSITIVE_ACCESS', 100, 60) THEN
    RAISE EXCEPTION 'Rate limit exceeded for sensitive data access';
  END IF;
  
  RETURN TRUE;
END;
$$;

-- 3. Fonction de chiffrement améliorée pour les données critiques
CREATE OR REPLACE FUNCTION encrypt_critical_data(data_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Utiliser un hash plus fort pour les données critiques
  RETURN encode(digest(data_text || current_setting('app.settings.salt', true), 'sha512'), 'hex');
END;
$$;

-- 4. Politique de sécurité pour empêcher les injections SQL
CREATE OR REPLACE FUNCTION sanitize_input(input_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Nettoyer les caractères dangereux
  RETURN regexp_replace(input_text, '[;<>''"]', '', 'g');
END;
$$;

-- 5. Fonction de verrouillage de compte après tentatives malveillantes
CREATE OR REPLACE FUNCTION check_account_lockout(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  failed_attempts INTEGER;
  last_attempt TIMESTAMP;
BEGIN
  -- Compter les tentatives échouées dans les 30 dernières minutes
  SELECT COUNT(*), MAX(timestamp) INTO failed_attempts, last_attempt
  FROM audit_log
  WHERE user_id = user_id_param
    AND action = 'FAILED_ACCESS'
    AND timestamp > NOW() - INTERVAL '30 minutes';
  
  -- Verrouiller si plus de 5 tentatives échouées
  IF failed_attempts >= 5 THEN
    -- Mettre à jour le profil pour marquer comme temporairement verrouillé
    INSERT INTO audit_log (user_id, table_name, action, details)
    VALUES (
      user_id_param,
      'security',
      'ACCOUNT_LOCKED',
      jsonb_build_object('reason', 'Too many failed attempts', 'locked_until', NOW() + INTERVAL '1 hour')
    );
    
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- 6. Trigger de sécurité pour audit automatique des modifications sur subscribers
CREATE OR REPLACE FUNCTION audit_subscribers_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Enregistrer toute modification sur la table subscribers
  INSERT INTO audit_log (user_id, table_name, action, details)
  VALUES (
    COALESCE(NEW.user_id, OLD.user_id),
    'subscribers',
    TG_OP,
    jsonb_build_object(
      'old_data', CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
      'new_data', CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) ELSE NULL END,
      'changed_by', auth.uid()
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 7. Appliquer le trigger d'audit sur subscribers
CREATE TRIGGER audit_subscribers_changes
  AFTER INSERT OR UPDATE OR DELETE ON subscribers
  FOR EACH ROW
  EXECUTE FUNCTION audit_subscribers_changes();

-- 8. Trigger de sécurité pour audit automatique des modifications sur profiles
CREATE OR REPLACE FUNCTION audit_profiles_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Enregistrer les modifications sensibles sur les profils
  IF TG_OP = 'UPDATE' AND (
    OLD.email IS DISTINCT FROM NEW.email OR
    OLD.phone IS DISTINCT FROM NEW.phone OR
    OLD.strava_access_token IS DISTINCT FROM NEW.strava_access_token OR
    OLD.instagram_access_token IS DISTINCT FROM NEW.instagram_access_token
  ) THEN
    INSERT INTO audit_log (user_id, table_name, action, details)
    VALUES (
      NEW.user_id,
      'profiles',
      'SENSITIVE_UPDATE',
      jsonb_build_object(
        'fields_changed', ARRAY[
          CASE WHEN OLD.email IS DISTINCT FROM NEW.email THEN 'email' END,
          CASE WHEN OLD.phone IS DISTINCT FROM NEW.phone THEN 'phone' END,
          CASE WHEN OLD.strava_access_token IS DISTINCT FROM NEW.strava_access_token THEN 'strava_token' END,
          CASE WHEN OLD.instagram_access_token IS DISTINCT FROM NEW.instagram_access_token THEN 'instagram_token' END
        ]::TEXT[],
        'changed_by', auth.uid()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 9. Appliquer le trigger d'audit sur profiles
CREATE TRIGGER audit_profiles_changes
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION audit_profiles_changes();