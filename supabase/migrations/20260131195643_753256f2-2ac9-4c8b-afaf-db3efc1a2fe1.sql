-- Add visibility_type column with check constraint
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS visibility_type TEXT DEFAULT 'friends' 
CHECK (visibility_type IN ('friends', 'club', 'public'));

-- Add hidden_from_users array column
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS hidden_from_users UUID[] DEFAULT '{}';

-- Migrate existing data: convert friends_only to visibility_type
UPDATE public.sessions 
SET visibility_type = CASE 
  WHEN friends_only = true THEN 'friends'
  WHEN club_id IS NOT NULL THEN 'club'
  ELSE 'public'
END
WHERE visibility_type IS NULL OR visibility_type = 'friends';

-- Create index for hidden_from_users for efficient filtering
CREATE INDEX IF NOT EXISTS idx_sessions_hidden_from_users ON public.sessions USING GIN(hidden_from_users);