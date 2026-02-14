-- Allow users to delete messages in their conversations
CREATE POLICY "Users can delete messages in their conversations"
ON public.messages
FOR DELETE
USING (
  sender_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_id
    AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.conversation_id = messages.conversation_id
    AND gm.user_id = auth.uid()
  )
);

-- Allow users to delete their direct conversations
CREATE POLICY "Users can delete their direct conversations"
ON public.conversations
FOR DELETE
USING (
  (participant_1 = auth.uid() OR participant_2 = auth.uid())
  AND (is_group = false OR is_group IS NULL)
);
