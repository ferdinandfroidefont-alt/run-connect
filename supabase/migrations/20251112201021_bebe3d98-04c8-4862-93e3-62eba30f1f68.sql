-- Fonction pour vérifier si un utilisateur existe et si son email est confirmé
CREATE OR REPLACE FUNCTION public.check_user_exists(email_param text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_exists boolean;
  user_email_confirmed boolean;
BEGIN
  -- Vérifier si l'utilisateur existe dans auth.users
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = email_param) INTO user_exists;
  
  IF user_exists THEN
    -- Vérifier si l'email est confirmé
    SELECT email_confirmed_at IS NOT NULL 
    FROM auth.users 
    WHERE email = email_param 
    INTO user_email_confirmed;
    
    RETURN jsonb_build_object(
      'exists', true,
      'email_confirmed', user_email_confirmed
    );
  ELSE
    RETURN jsonb_build_object('exists', false, 'email_confirmed', false);
  END IF;
END;
$$;