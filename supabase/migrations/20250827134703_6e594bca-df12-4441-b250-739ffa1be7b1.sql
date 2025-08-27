-- Add welcome video tracking to profiles table
ALTER TABLE public.profiles 
ADD COLUMN welcome_video_seen BOOLEAN DEFAULT FALSE;