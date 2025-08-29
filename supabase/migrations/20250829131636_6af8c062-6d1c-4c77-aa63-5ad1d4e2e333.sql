-- Corriger le problème de security definer view et finaliser les protections

-- 1. Supprimer la vue security definer et la remplacer par une fonction
DROP VIEW IF EXISTS security_dashboard;

-- 2. Créer une fonction sécurisée pour le dashboard admin
CREATE OR REPLACE FUNCTION get_security_dashboard()
RETURNS TABLE(
  date DATE,
  table_name TEXT,
  action TEXT,
  access_count BIGINT,
  unique_users BIGINT
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
  SELECT 
    DATE_TRUNC('day', al.timestamp)::DATE as date,
    al.table_name,
    al.action,
    COUNT(*) as access_count,
    COUNT(DISTINCT al.user_id) as unique_users
  FROM audit_log al
  WHERE al.timestamp >= NOW() - INTERVAL '30 days'
  GROUP BY DATE_TRUNC('day', al.timestamp), al.table_name, al.action
  ORDER BY date DESC;
END;
$$;

-- 3. Fonction pour créer un rapport de sécurité complet
CREATE OR REPLACE FUNCTION generate_security_report()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  report JSONB;
  total_users INTEGER;
  active_users INTEGER;
  blocked_users INTEGER;
  failed_attempts INTEGER;
BEGIN
  -- Vérifier les privilèges admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Collecter les statistiques
  SELECT COUNT(*) INTO total_users FROM profiles;
  
  SELECT COUNT(*) INTO active_users 
  FROM profiles 
  WHERE last_seen >= NOW() - INTERVAL '24 hours';
  
  SELECT COUNT(DISTINCT user_id) INTO blocked_users
  FROM audit_log
  WHERE action = 'ACCOUNT_LOCKED' 
    AND timestamp >= NOW() - INTERVAL '24 hours';
  
  SELECT COUNT(*) INTO failed_attempts
  FROM audit_log
  WHERE action = 'FAILED_ACCESS'
    AND timestamp >= NOW() - INTERVAL '24 hours';

  -- Construire le rapport
  report := jsonb_build_object(
    'generated_at', NOW(),
    'generated_by', auth.uid(),
    'summary', jsonb_build_object(
      'total_users', total_users,
      'active_users_24h', active_users,
      'blocked_users_24h', blocked_users,
      'failed_attempts_24h', failed_attempts
    ),
    'security_status', CASE 
      WHEN failed_attempts > 100 THEN 'HIGH_RISK'
      WHEN failed_attempts > 50 THEN 'MEDIUM_RISK'
      ELSE 'LOW_RISK'
    END
  );

  -- Enregistrer la génération du rapport
  INSERT INTO audit_log (user_id, table_name, action, details)
  VALUES (
    auth.uid(),
    'security',
    'REPORT_GENERATED',
    report
  );

  RETURN report;
END;
$$;

-- 4. Fonction de maintenance automatique de sécurité
CREATE OR REPLACE FUNCTION security_maintenance()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  maintenance_report JSONB;
  cleaned_logs INTEGER;
  expired_sessions INTEGER;
BEGIN
  -- Nettoyer les anciens logs
  SELECT cleanup_audit_logs() INTO cleaned_logs;
  
  -- Nettoyer les sessions expirées
  SELECT cleanup_expired_sessions();
  GET DIAGNOSTICS expired_sessions = ROW_COUNT;
  
  -- Créer le rapport de maintenance
  maintenance_report := jsonb_build_object(
    'maintenance_date', NOW(),
    'cleaned_audit_logs', cleaned_logs,
    'expired_sessions_cleaned', expired_sessions,
    'status', 'completed'
  );
  
  -- Enregistrer la maintenance
  INSERT INTO audit_log (user_id, table_name, action, details)
  VALUES (
    NULL,
    'system',
    'SECURITY_MAINTENANCE',
    maintenance_report
  );
  
  RETURN maintenance_report;
END;
$$;