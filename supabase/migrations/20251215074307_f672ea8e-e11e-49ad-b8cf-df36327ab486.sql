
-- Supprimer l'ancienne fonction get_security_dashboard
DROP FUNCTION IF EXISTS public.get_security_dashboard();

-- Recréer avec search_path sécurisé
CREATE OR REPLACE FUNCTION public.get_security_dashboard()
RETURNS TABLE(
  date text,
  table_name text,
  action text,
  access_count bigint,
  unique_users bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  RETURN QUERY
  SELECT 
    to_char(al.timestamp, 'YYYY-MM-DD') as date,
    al.table_name,
    al.action,
    COUNT(*)::bigint as access_count,
    COUNT(DISTINCT al.user_id)::bigint as unique_users
  FROM audit_log al
  WHERE al.timestamp > NOW() - INTERVAL '7 days'
  GROUP BY to_char(al.timestamp, 'YYYY-MM-DD'), al.table_name, al.action
  ORDER BY date DESC, access_count DESC;
END;
$$;

-- Sécuriser les autres fonctions restantes
CREATE OR REPLACE FUNCTION public.trigger_generate_club_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.is_group = true AND NEW.club_code IS NULL THEN
        NEW.club_code = generate_club_code();
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_push_token_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.push_token IS DISTINCT FROM OLD.push_token AND NEW.push_token IS NOT NULL THEN
    NEW.push_token_updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_current_week_start()
RETURNS date
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN DATE_TRUNC('week', NOW() AT TIME ZONE 'Europe/Paris')::DATE;
END;
$$;

-- Ajouter une politique pour permettre la lecture de profils publics avec champs limités (pour profils partagés)
CREATE POLICY "Public can view limited profile via function"
ON profiles FOR SELECT
TO anon
USING (false); -- Bloque l'accès direct, forcer l'utilisation de get_public_profile_limited()
