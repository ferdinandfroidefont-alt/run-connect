-- Create function to update push token in profiles table
CREATE OR REPLACE FUNCTION public.update_push_token(user_id_param uuid, push_token_param text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.profiles 
  SET push_token = push_token_param, updated_at = now()
  WHERE user_id = user_id_param;
END;
$$;