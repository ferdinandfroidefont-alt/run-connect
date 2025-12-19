-- ========================================
-- CREATE USER ROLES TABLE AND FIX REMAINING FUNCTIONS
-- ========================================

-- Create app_role enum if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
  END IF;
END $$;

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Only admins can manage roles (via has_role function)
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
);

-- has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$function$;

-- Migrate existing is_admin from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'admin'::app_role
FROM public.profiles p
WHERE p.is_admin = true
AND p.user_id IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- handle_follow_request_notification
CREATE OR REPLACE FUNCTION public.handle_follow_request_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  follower_profile RECORD;
BEGIN
  SELECT username, display_name, avatar_url 
  INTO follower_profile
  FROM profiles 
  WHERE user_id = NEW.follower_id;

  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    NEW.following_id,
    'follow_request',
    'Nouvelle demande de suivi',
    COALESCE(follower_profile.display_name, follower_profile.username, 'Quelqu''un') || ' souhaite vous suivre',
    jsonb_build_object(
      'follow_id', NEW.id,
      'follower_id', NEW.follower_id,
      'follower_name', COALESCE(follower_profile.display_name, follower_profile.username),
      'follower_avatar', follower_profile.avatar_url
    )
  );

  RETURN NEW;
END;
$function$;

-- handle_session_request_notification
CREATE OR REPLACE FUNCTION public.handle_session_request_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  requester_profile RECORD;
  session_info RECORD;
BEGIN
  SELECT title, organizer_id
  INTO session_info
  FROM sessions 
  WHERE id = NEW.session_id;
  
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  
  SELECT username, display_name, avatar_url 
  INTO requester_profile
  FROM profiles 
  WHERE user_id = NEW.user_id;

  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    session_info.organizer_id,
    'session_request',
    'Nouvelle demande de participation',
    COALESCE(requester_profile.display_name, requester_profile.username, 'Quelqu''un') || 
    ' souhaite rejoindre votre session: ' || session_info.title,
    jsonb_build_object(
      'request_id', NEW.id,
      'session_id', NEW.session_id,
      'requester_id', NEW.user_id,
      'requester_name', COALESCE(requester_profile.display_name, requester_profile.username),
      'requester_avatar', requester_profile.avatar_url,
      'session_title', session_info.title
    )
  );

  RETURN NEW;
END;
$function$;