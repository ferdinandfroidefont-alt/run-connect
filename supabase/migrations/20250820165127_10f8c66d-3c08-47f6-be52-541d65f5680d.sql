-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Members can view all members of their groups" ON public.group_members;

-- Create a simpler policy that doesn't cause recursion
-- Members can view group members if they are part of the same conversation
CREATE POLICY "Members can view group members" 
ON public.group_members 
FOR SELECT 
USING (
  conversation_id IN (
    SELECT DISTINCT conversation_id 
    FROM group_members gm2 
    WHERE gm2.user_id = auth.uid()
  )
);