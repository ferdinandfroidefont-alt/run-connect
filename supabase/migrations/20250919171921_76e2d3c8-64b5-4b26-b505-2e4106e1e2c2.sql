-- Add is_private field to conversations table for club privacy settings
ALTER TABLE public.conversations ADD COLUMN is_private boolean DEFAULT false;

-- Update the existing is_private column comment to clarify its usage
COMMENT ON COLUMN public.conversations.is_private IS 'Indicates if the club/group is private (true) or public (false). Only affects group conversations.';