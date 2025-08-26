-- Create a function to get multiple safe public profiles at once
CREATE OR REPLACE FUNCTION public.get_safe_public_profiles(profile_user_ids uuid[])
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
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    p.user_id,
    p.username,
    p.display_name,
    CASE WHEN p.is_private = false THEN p.avatar_url ELSE NULL END as avatar_url,
    CASE WHEN p.is_private = false THEN p.bio ELSE NULL END as bio,
    p.is_premium,
    p.created_at,
    CASE WHEN p.show_online_status = true AND p.is_private = false THEN p.is_online ELSE false END as is_online,
    CASE WHEN p.is_private = false THEN p.show_online_status ELSE false END as show_online_status
  FROM public.profiles p
  WHERE p.user_id = ANY(profile_user_ids)
    AND p.user_id != auth.uid()  -- Don't include own profile
    AND (p.is_private = false OR p.is_private IS NULL);  -- Only show public profiles
$$;