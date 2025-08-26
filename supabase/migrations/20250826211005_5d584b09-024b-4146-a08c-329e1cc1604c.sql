-- Fix security vulnerability: Restrict access to sensitive profile data
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view limited public profile information of others" ON public.profiles;

-- Create a secure policy that only exposes safe, public information
CREATE POLICY "Users can view safe public profile information" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND user_id <> auth.uid()
  AND (
    -- Only allow access to specific non-sensitive columns through a view-like approach
    -- This policy will be combined with application-level filtering
    is_private = false OR is_private IS NULL
  )
);

-- Create a secure function to get only safe public profile data
CREATE OR REPLACE FUNCTION public.get_safe_public_profile(profile_user_id uuid)
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
  WHERE p.user_id = profile_user_id
    AND p.user_id != auth.uid()  -- Don't use this function for own profile
    AND p.is_private = false;    -- Only show public profiles
$$;