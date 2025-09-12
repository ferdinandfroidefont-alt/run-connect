-- Corriger les dernières fonctions avec search_path manquant
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

CREATE OR REPLACE FUNCTION public.trigger_generate_club_code()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Si c'est un club et qu'il n'y a pas encore de code
    IF NEW.is_group = true AND NEW.club_code IS NULL THEN
        NEW.club_code = generate_club_code();
    END IF;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_follow_request_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  follower_profile RECORD;
BEGIN
  -- Get follower profile information
  SELECT username, display_name, avatar_url 
  INTO follower_profile
  FROM profiles 
  WHERE user_id = NEW.follower_id;

  -- Create notification for the user being followed (corrected column name)
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    data
  ) VALUES (
    NEW.following_id,  -- Changed from followed_id to following_id
    'follow_request',
    'Nouvelle demande de suivi',
    COALESCE(follower_profile.display_name, follower_profile.username, 'Quelqu''un') || ' souhaite vous suivre',
    json_build_object(
      'follow_id', NEW.id,
      'follower_id', NEW.follower_id,
      'follower_name', COALESCE(follower_profile.display_name, follower_profile.username),
      'follower_avatar', follower_profile.avatar_url
    )
  );

  RETURN NEW;
END;
$function$;