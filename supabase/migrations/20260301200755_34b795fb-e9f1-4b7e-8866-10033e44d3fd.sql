
-- Add cover image URL to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cover_image_url TEXT DEFAULT NULL;
