-- Add unique index on user_id for better performance and data integrity
-- Now that we rely exclusively on user_id for access control

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscribers_user_id_unique 
ON public.subscribers (user_id);