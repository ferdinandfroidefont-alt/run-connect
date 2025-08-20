-- Add online status and last seen to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_seen timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS show_online_status boolean DEFAULT true;