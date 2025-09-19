-- Add location field to conversations table for club location (city)
ALTER TABLE public.conversations ADD COLUMN location text;

-- Update the location column comment to clarify its usage
COMMENT ON COLUMN public.conversations.location IS 'City or location where the club is based. Only used for group conversations.';