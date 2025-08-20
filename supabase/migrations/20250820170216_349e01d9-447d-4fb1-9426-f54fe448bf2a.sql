-- Update RLS policy for sessions to handle club visibility
DROP POLICY IF EXISTS "Sessions are viewable by authenticated users" ON public.sessions;

-- Create new policy for sessions visibility
CREATE POLICY "Sessions are viewable with club restrictions" 
ON public.sessions 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    -- Public sessions (no club)
    club_id IS NULL 
    OR 
    -- Club sessions - user must be a member of the club
    (club_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM group_members gm 
      WHERE gm.conversation_id = club_id 
      AND gm.user_id = auth.uid()
    ))
  )
);