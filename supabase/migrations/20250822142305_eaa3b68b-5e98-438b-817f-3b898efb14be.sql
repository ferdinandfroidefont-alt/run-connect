-- Update the conv_select policy to allow group members to view group conversations
DROP POLICY IF EXISTS "conv_select" ON conversations;

CREATE POLICY "conv_select" 
ON conversations 
FOR SELECT 
USING (
  (auth.uid() = participant_1) OR 
  (auth.uid() = participant_2) OR 
  (auth.uid() = created_by) OR
  -- Allow group members to view group conversations
  (is_group = true AND EXISTS (
    SELECT 1 FROM group_members gm 
    WHERE gm.conversation_id = conversations.id 
    AND gm.user_id = auth.uid()
  ))
);