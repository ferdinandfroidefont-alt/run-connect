-- Enable real-time capabilities for profiles table
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- Ensure profiles table is in the realtime publication
DO $$
BEGIN
    -- Add profiles table to supabase_realtime publication
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- Table already exists in publication
    WHEN others THEN
        RAISE NOTICE 'Could not add profiles to publication: %', SQLERRM;
END $$;

-- Update profiles table to set default values for online status columns
UPDATE public.profiles 
SET 
    is_online = COALESCE(is_online, false),
    last_seen = COALESCE(last_seen, now()),
    show_online_status = COALESCE(show_online_status, true)
WHERE is_online IS NULL OR last_seen IS NULL OR show_online_status IS NULL;