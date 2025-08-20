-- Add allow_friend_suggestions field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN allow_friend_suggestions BOOLEAN DEFAULT true;

-- Add comment to explain the field
COMMENT ON COLUMN public.profiles.allow_friend_suggestions IS 'Allow user to appear in friend suggestions and receive friend suggestions';