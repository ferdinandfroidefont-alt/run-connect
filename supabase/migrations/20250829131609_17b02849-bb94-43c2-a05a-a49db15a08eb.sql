-- Étape 5: Créer un composant de sécurité côté frontend

-- 1. Créer une vue sécurisée pour les statistiques d'audit (admins seulement)
CREATE OR REPLACE VIEW security_dashboard AS
SELECT 
  DATE_TRUNC('day', timestamp) as date,
  table_name,
  action,
  COUNT(*) as access_count,
  COUNT(DISTINCT user_id) as unique_users
FROM audit_log
WHERE timestamp >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', timestamp), table_name, action
ORDER BY date DESC;

-- 2. Politique RLS pour la vue (admin seulement)
ALTER VIEW security_dashboard SET (security_barrier = true);

-- 3. Fonction pour obtenir les alertes de sécurité
CREATE OR REPLACE FUNCTION get_security_alerts()
RETURNS TABLE(
  alert_type TEXT,
  message TEXT,
  severity TEXT,
  count BIGINT,
  last_occurrence TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier si l'utilisateur est admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  RETURN QUERY
  WITH alerts AS (
    -- Tentatives de connexion suspectes
    SELECT 
      'SUSPICIOUS_LOGIN' as alert_type,
      'Multiple failed login attempts detected' as message,
      'HIGH' as severity,
      COUNT(*) as count,
      MAX(timestamp) as last_occurrence
    FROM audit_log
    WHERE action = 'FAILED_ACCESS'
      AND timestamp >= NOW() - INTERVAL '24 hours'
    HAVING COUNT(*) >= 5
    
    UNION ALL
    
    -- Accès excessif aux données sensibles
    SELECT 
      'EXCESSIVE_DATA_ACCESS' as alert_type,
      'User accessing sensitive data too frequently' as message,
      'MEDIUM' as severity,
      COUNT(*) as count,
      MAX(timestamp) as last_occurrence
    FROM audit_log
    WHERE action = 'SENSITIVE_ACCESS'
      AND timestamp >= NOW() - INTERVAL '1 hour'
    GROUP BY user_id
    HAVING COUNT(*) > 50
    
    UNION ALL
    
    -- Comptes verrouillés
    SELECT 
      'ACCOUNT_LOCKED' as alert_type,
      'Account locked due to suspicious activity' as message,
      'HIGH' as severity,
      COUNT(*) as count,
      MAX(timestamp) as last_occurrence
    FROM audit_log
    WHERE action = 'ACCOUNT_LOCKED'
      AND timestamp >= NOW() - INTERVAL '24 hours'
  )
  SELECT * FROM alerts WHERE count > 0
  ORDER BY 
    CASE severity 
      WHEN 'HIGH' THEN 1 
      WHEN 'MEDIUM' THEN 2 
      ELSE 3 
    END,
    last_occurrence DESC;
END;
$$;

-- 4. Fonction pour nettoyer les anciens logs d'audit (rétention 90 jours)
CREATE OR REPLACE FUNCTION cleanup_audit_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Supprimer les logs plus anciens que 90 jours
  DELETE FROM audit_log 
  WHERE timestamp < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Enregistrer l'opération de nettoyage
  INSERT INTO audit_log (user_id, table_name, action, details)
  VALUES (
    NULL,
    'audit_log',
    'CLEANUP',
    jsonb_build_object('deleted_records', deleted_count, 'cleanup_date', NOW())
  );
  
  RETURN deleted_count;
END;
$$;

-- 5. Fonction pour forcer la déconnexion d'un utilisateur (admin seulement)
CREATE OR REPLACE FUNCTION force_user_logout(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier les privilèges admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  -- Invalider le token push de l'utilisateur pour forcer la déconnexion
  UPDATE profiles 
  SET push_token = NULL, updated_at = NOW()
  WHERE user_id = target_user_id;
  
  -- Enregistrer l'action dans l'audit
  INSERT INTO audit_log (user_id, table_name, action, details)
  VALUES (
    auth.uid(),
    'security',
    'FORCE_LOGOUT',
    jsonb_build_object('target_user', target_user_id, 'admin_action', true)
  );
  
  RETURN TRUE;
END;
$$;