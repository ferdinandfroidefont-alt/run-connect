-- Drop the existing restrictive policy
DROP POLICY "Users can view group members they belong to" ON group_members;

-- Create a new policy that allows members to see all members of groups they belong to
CREATE POLICY "Members can view all members of their groups" 
ON group_members 
FOR SELECT 
USING (
  conversation_id IN (
    SELECT DISTINCT gm.conversation_id 
    FROM group_members gm 
    WHERE gm.user_id = auth.uid()
  )
);