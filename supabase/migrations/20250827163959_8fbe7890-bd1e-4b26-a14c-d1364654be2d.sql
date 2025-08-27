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
-- Only do this if there are no NULL user_ids left
DO $$
BEGIN
  -- Check if all user_ids are now populated
  IF NOT EXISTS (SELECT 1 FROM public.subscribers WHERE user_id IS NULL) THEN
    ALTER TABLE public.subscribers ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;

-- Drop all existing RLS policies for subscribers table
DROP POLICY IF EXISTS "select_own_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "select_own_subscription_secure" ON public.subscribers;
DROP POLICY IF EXISTS "insert_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "insert_subscription_secure" ON public.subscribers;
DROP POLICY IF EXISTS "update_own_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "update_own_subscription_secure" ON public.subscribers;

-- Create new, secure RLS policies that only allow access by user_id
CREATE POLICY "subscribers_select_own_only" ON public.subscribers
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "subscribers_insert_own_only" ON public.subscribers
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "subscribers_update_own_only" ON public.subscribers
  FOR UPDATE
  USING (user_id = auth.uid());