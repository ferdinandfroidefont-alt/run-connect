-- Add Instagram connection fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN instagram_connected boolean DEFAULT false,
ADD COLUMN instagram_verified_at timestamp with time zone,
ADD COLUMN instagram_user_id text,
ADD COLUMN instagram_access_token text,
ADD COLUMN instagram_username text;