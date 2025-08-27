-- Fix security issue: restrict subscribers table access to user_id only
-- This prevents potential email-based access exploitation

-- First, update any existing subscription records that might have NULL user_id
-- We'll try to match them with auth.users based on email
UPDATE public.subscribers 
SET user_id = au.id
FROM auth.users au
WHERE subscribers.user_id IS NULL 
  AND subscribers.email = au.email;

-- Make user_id non-nullable to enforce proper user association
ALTER TABLE public.subscribers 
ALTER COLUMN user_id SET NOT NULL;

-- Drop the existing insecure RLS policy
DROP POLICY IF EXISTS "select_own_subscription" ON public.subscribers;

-- Create a new, more secure RLS policy that only allows access by user_id
CREATE POLICY "select_own_subscription_secure" ON public.subscribers
  FOR SELECT
  USING (user_id = auth.uid());

-- Also update the insert policy to ensure user_id is always set
DROP POLICY IF EXISTS "insert_subscription" ON public.subscribers;

CREATE POLICY "insert_subscription_secure" ON public.subscribers
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Update the update policy to be more restrictive
DROP POLICY IF EXISTS "update_own_subscription" ON public.subscribers;

CREATE POLICY "update_own_subscription_secure" ON public.subscribers
  FOR UPDATE
  USING (user_id = auth.uid());