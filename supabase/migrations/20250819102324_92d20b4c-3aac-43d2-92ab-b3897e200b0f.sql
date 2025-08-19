-- Move extensions from public schema to extensions schema
DROP EXTENSION IF EXISTS pg_cron CASCADE;
DROP EXTENSION IF EXISTS pg_net CASCADE;

-- Create extensions in the proper schema
CREATE EXTENSION IF NOT EXISTS pg_cron SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- Recreate the cleanup function 
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
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

-- Schedule the cleanup function to run every hour using the extensions schema
SELECT extensions.cron.schedule(
  'cleanup-expired-sessions',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT public.cleanup_expired_sessions();
  $$
);