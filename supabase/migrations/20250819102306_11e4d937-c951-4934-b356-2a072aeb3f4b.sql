-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete sessions that are more than 2 hours past their scheduled time
  DELETE FROM public.sessions 
  WHERE scheduled_at < (NOW() - INTERVAL '2 hours');
  
  -- Log the cleanup operation
  RAISE NOTICE 'Cleanup completed: expired sessions removed';
END;
$$;

-- Schedule the cleanup function to run every hour
SELECT cron.schedule(
  'cleanup-expired-sessions',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT cleanup_expired_sessions();
  $$
);