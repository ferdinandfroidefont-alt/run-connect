-- Add push_token field to profiles table for storing FCM/APNS tokens
ALTER TABLE public.profiles ADD COLUMN push_token TEXT;