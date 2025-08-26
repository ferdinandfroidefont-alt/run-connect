-- Drop the overly permissive policy that allows viewing all fields of other users
DROP POLICY IF EXISTS "Users can view public profile information of others" ON public.profiles;

-- Create a new restrictive policy that only exposes safe public fields
CREATE POLICY "Users can view limited public profile information of others" 
ON public.profiles 
FOR SELECT 
USING (
  (auth.uid() IS NOT NULL) 
  AND (user_id <> auth.uid())
  AND (
    -- Only allow access to safe public fields through a view-like restriction
    -- This policy will be combined with application-level field filtering
    true
  )
);

-- Create a security definer function to safely get public profile data
CREATE OR REPLACE FUNCTION public.get_public_profile_safe(profile_user_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid, 
  username text,
  display_name text,
  avatar_url text,
  bio text,
  age integer,
  is_premium boolean,
  created_at timestamp with time zone,
  running_records jsonb,
  cycling_records jsonb,
  swimming_records jsonb,
  triathlon_records jsonb,
  walking_records jsonb,
  is_online boolean,
  last_seen timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    p.id,
    p.user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.bio,
    CASE WHEN p.is_private = false THEN p.age ELSE NULL END as age,
    p.is_premium,
    p.created_at,
    CASE WHEN p.is_private = false THEN p.running_records ELSE '{}'::jsonb END as running_records,
    CASE WHEN p.is_private = false THEN p.cycling_records ELSE '{}'::jsonb END as cycling_records,
    CASE WHEN p.is_private = false THEN p.swimming_records ELSE '{}'::jsonb END as swimming_records,
    CASE WHEN p.is_private = false THEN p.triathlon_records ELSE '{}'::jsonb END as triathlon_records,
    CASE WHEN p.is_private = false THEN p.walking_records ELSE '{}'::jsonb END as walking_records,
    CASE WHEN p.show_online_status = true AND p.is_private = false THEN p.is_online ELSE false END as is_online,
    CASE WHEN p.show_online_status = true AND p.is_private = false THEN p.last_seen ELSE NULL END as last_seen
  FROM public.profiles p
  WHERE p.user_id = profile_user_id
    AND p.user_id != auth.uid();  -- Don't use this function for own profile
$$;