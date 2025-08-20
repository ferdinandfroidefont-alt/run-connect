-- Create a function to get email from username
CREATE OR REPLACE FUNCTION public.get_email_from_username(username_param text)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT au.email
  FROM public.profiles p
  JOIN auth.users au ON p.user_id = au.id
  WHERE p.username = username_param;
$$;