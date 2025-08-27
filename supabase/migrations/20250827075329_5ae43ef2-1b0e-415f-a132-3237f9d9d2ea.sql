-- Add Strava verification fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN strava_connected boolean DEFAULT false,
ADD COLUMN strava_user_id text,
ADD COLUMN strava_access_token text,
ADD COLUMN strava_refresh_token text,
ADD COLUMN strava_verified_at timestamp with time zone;