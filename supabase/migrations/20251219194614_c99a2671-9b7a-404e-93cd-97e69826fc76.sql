-- ========================================
-- FINAL FINAL BATCH - ALL REMAINING FUNCTIONS
-- All functions that may still lack search_path
-- ========================================

-- get_safe_public_profiles (needs DROP first due to RETURNS TABLE)
DROP FUNCTION IF EXISTS public.get_safe_public_profiles(uuid[]);

CREATE FUNCTION public.get_safe_public_profiles(profile_user_ids uuid[])
RETURNS TABLE(
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  bio text,
  is_premium boolean,
  created_at timestamp with time zone,
  is_online boolean,
  show_online_status boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.username,
    p.display_name,
    CASE WHEN p.is_private = false THEN p.avatar_url ELSE NULL END,
    CASE WHEN p.is_private = false THEN p.bio ELSE NULL END,
    p.is_premium,
    p.created_at,
    CASE WHEN p.show_online_status = true AND p.is_private = false THEN p.is_online ELSE false END,
    CASE WHEN p.is_private = false THEN p.show_online_status ELSE false END
  FROM public.profiles p
  WHERE p.user_id = ANY(profile_user_ids)
    AND p.user_id != auth.uid()
    AND (p.is_private = false OR p.is_private IS NULL);
END;
$function$;

-- get_public_profile (needs DROP first due to RETURNS TABLE)
DROP FUNCTION IF EXISTS public.get_public_profile(uuid);

CREATE FUNCTION public.get_public_profile(profile_user_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.bio,
    p.created_at
  FROM public.profiles p
  WHERE p.user_id = profile_user_id;
END;
$function$;

-- sanitize_input
CREATE OR REPLACE FUNCTION public.sanitize_input(input_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN regexp_replace(input_text, '[;<>''"]', '', 'g');
END;
$function$;

-- encrypt_critical_data
CREATE OR REPLACE FUNCTION public.encrypt_critical_data(data_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN encode(digest(data_text || current_setting('app.settings.salt', true), 'sha512'), 'hex');
END;
$function$;

-- security_maintenance
CREATE OR REPLACE FUNCTION public.security_maintenance()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  maintenance_report JSONB;
  cleaned_logs INTEGER;
BEGIN
  SELECT cleanup_audit_logs() INTO cleaned_logs;
  PERFORM cleanup_expired_sessions();
  
  maintenance_report := jsonb_build_object(
    'maintenance_date', NOW(),
    'cleaned_audit_logs', cleaned_logs,
    'status', 'completed'
  );
  
  INSERT INTO audit_log (user_id, table_name, action, details)
  VALUES (NULL, 'system', 'SECURITY_MAINTENANCE', maintenance_report);
  
  RETURN maintenance_report;
END;
$function$;

-- get_security_alerts
CREATE OR REPLACE FUNCTION public.get_security_alerts()
RETURNS TABLE(alert_type text, message text, severity text, count bigint, last_occurrence timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin = true
  ) AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  RETURN QUERY
  WITH alerts AS (
    SELECT 
      'SUSPICIOUS_LOGIN'::text as alert_type,
      'Multiple failed login attempts detected'::text as message,
      'HIGH'::text as severity,
      COUNT(*)::bigint as count,
      MAX(timestamp) as last_occurrence
    FROM audit_log
    WHERE action = 'FAILED_ACCESS'
      AND timestamp >= NOW() - INTERVAL '24 hours'
    HAVING COUNT(*) >= 5
    
    UNION ALL
    
    SELECT 
      'ACCOUNT_LOCKED'::text,
      'Account locked due to suspicious activity'::text,
      'HIGH'::text,
      COUNT(*)::bigint,
      MAX(timestamp)
    FROM audit_log
    WHERE action = 'ACCOUNT_LOCKED'
      AND timestamp >= NOW() - INTERVAL '24 hours'
  )
  SELECT * FROM alerts WHERE alerts.count > 0
  ORDER BY 
    CASE alerts.severity 
      WHEN 'HIGH' THEN 1 
      WHEN 'MEDIUM' THEN 2 
      ELSE 3 
    END,
    alerts.last_occurrence DESC;
END;
$function$;

-- generate_security_report
CREATE OR REPLACE FUNCTION public.generate_security_report()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  report JSONB;
  total_users INTEGER;
  active_users INTEGER;
  blocked_users_count INTEGER;
  failed_attempts INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin = true
  ) AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  SELECT COUNT(*) INTO total_users FROM profiles;
  SELECT COUNT(*) INTO active_users FROM profiles WHERE last_seen >= NOW() - INTERVAL '24 hours';
  SELECT COUNT(DISTINCT user_id) INTO blocked_users_count FROM audit_log WHERE action = 'ACCOUNT_LOCKED' AND timestamp >= NOW() - INTERVAL '24 hours';
  SELECT COUNT(*) INTO failed_attempts FROM audit_log WHERE action = 'FAILED_ACCESS' AND timestamp >= NOW() - INTERVAL '24 hours';

  report := jsonb_build_object(
    'generated_at', NOW(),
    'generated_by', auth.uid(),
    'summary', jsonb_build_object(
      'total_users', total_users,
      'active_users_24h', active_users,
      'blocked_users_24h', blocked_users_count,
      'failed_attempts_24h', failed_attempts
    ),
    'security_status', CASE 
      WHEN failed_attempts > 100 THEN 'HIGH_RISK'
      WHEN failed_attempts > 50 THEN 'MEDIUM_RISK'
      ELSE 'LOW_RISK'
    END
  );

  INSERT INTO audit_log (user_id, table_name, action, details)
  VALUES (auth.uid(), 'security', 'REPORT_GENERATED', report);

  RETURN report;
END;
$function$;

-- force_user_logout
CREATE OR REPLACE FUNCTION public.force_user_logout(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin = true
  ) AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  UPDATE profiles SET push_token = NULL, updated_at = NOW() WHERE user_id = target_user_id;
  
  INSERT INTO audit_log (user_id, table_name, action, details)
  VALUES (auth.uid(), 'security', 'FORCE_LOGOUT', jsonb_build_object('target_user', target_user_id, 'admin_action', true));
  
  RETURN TRUE;
END;
$function$;