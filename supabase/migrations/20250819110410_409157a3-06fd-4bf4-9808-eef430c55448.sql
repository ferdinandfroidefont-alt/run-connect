-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a function to call the season reset edge function
CREATE OR REPLACE FUNCTION public.trigger_season_reset()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT net.http_post(
    url := 'https://dbptgehpknjsoisirviz.supabase.co/functions/v1/season-reset',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRicHRnZWhwa25qc29pc2lydml6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NjIxNDUsImV4cCI6MjA3MDIzODE0NX0.D1uw0ui_auBAi-dvodv6j2a9x3lvMnY69cDa9Wupjcs"}'::jsonb,
    body := '{"trigger": "cron"}'::jsonb
  );
$$;

-- Schedule the season reset to run every hour
-- This will check if it's time for a new season and reset if needed
SELECT cron.schedule(
  'season-reset-check',
  '0 * * * *', -- Every hour at minute 0
  'SELECT public.trigger_season_reset();'
);