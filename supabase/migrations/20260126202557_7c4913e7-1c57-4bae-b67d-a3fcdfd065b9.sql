-- =====================================================
-- FIX: Profile RLS Policy - Restrict to safe columns only
-- =====================================================

-- Step 1: Drop the problematic policy that exposes all columns
DROP POLICY IF EXISTS "Users can view safe public profile information" ON public.profiles;

-- Step 2: Create a new restrictive policy that ONLY works via the safe function
-- This policy blocks direct SELECT access to other users' profiles
-- Users MUST use get_safe_public_profiles or get_public_profile_safe functions instead
CREATE POLICY "Users can view safe public profile via function only" 
ON public.profiles 
FOR SELECT 
USING (
  -- Allow users to view their own full profile
  auth.uid() = user_id
);

-- Note: The existing policies already handle:
-- - "Users can view their own profile" - auth.uid() = user_id  
-- - "Users can update their own profile" - auth.uid() = user_id
-- - "Users can delete their own profile" - auth.uid() = user_id
-- - "Users can insert their own profile" - auth.uid() = user_id
-- - "Public can view limited profile via function" - USING (false) - blocks direct access

-- The get_safe_public_profiles function is SECURITY DEFINER so it bypasses RLS
-- and returns only safe columns (no phone, tokens, etc.)