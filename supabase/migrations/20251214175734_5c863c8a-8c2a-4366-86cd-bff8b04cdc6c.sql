
-- ============================================
-- CORRECTION: Supprimer l'ancienne fonction check_rate_limit avant de la recréer
-- ============================================

-- Supprimer l'ancienne fonction avec l'ancien nom de paramètre
DROP FUNCTION IF EXISTS public.check_rate_limit(uuid, text, integer, integer);

-- Recréer la fonction avec les nouveaux noms de paramètres
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  user_id_param uuid, 
  action_type_param text, 
  max_attempts integer, 
  time_window_minutes integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attempt_count INTEGER;
BEGIN
  -- Compter les tentatives récentes
  SELECT COUNT(*) INTO attempt_count
  FROM rate_limits
  WHERE user_id = user_id_param
    AND action_type = action_type_param
    AND created_at > NOW() - (time_window_minutes || ' minutes')::interval;
  
  -- Si limite atteinte, refuser
  IF attempt_count >= max_attempts THEN
    RETURN FALSE;
  END IF;
  
  -- Logger cette tentative
  INSERT INTO rate_limits(user_id, action_type)
  VALUES (user_id_param, action_type_param);
  
  RETURN TRUE;
END;
$$;
