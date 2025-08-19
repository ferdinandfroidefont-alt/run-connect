-- Add friends_only column to sessions table for premium feature
ALTER TABLE public.sessions 
ADD COLUMN friends_only BOOLEAN DEFAULT false;