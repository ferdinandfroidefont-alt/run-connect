-- Corriger la fonction audit_profiles_changes pour enlever la référence au champ email qui n'existe pas
CREATE OR REPLACE FUNCTION public.audit_profiles_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Enregistrer les modifications sensibles sur les profils
  IF TG_OP = 'UPDATE' AND (
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
$function$;