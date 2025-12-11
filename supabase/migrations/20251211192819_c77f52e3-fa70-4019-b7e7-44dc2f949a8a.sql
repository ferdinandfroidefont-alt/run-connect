-- Allow anonymous users to view public profiles (for sharing links)
CREATE POLICY "Anonymous can view public profiles"
ON public.profiles
FOR SELECT
TO anon
USING (is_private = false OR is_private IS NULL);