-- Fix recursive RLS policies for conversations table
-- Drop existing recursive policies
DROP POLICY IF EXISTS "Users can view their conversations and groups" ON public.conversations;
DROP POLICY IF EXISTS "Users can update their conversations and groups" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations and groups" ON public.conversations;

-- Create simple, non-recursive policies
CREATE POLICY "Users can view their direct conversations"
  ON public.conversations
  FOR SELECT
  TO authenticated
  USING (
    (is_group = false AND (auth.uid() = participant_1 OR auth.uid() = participant_2))
    OR 
    (is_group = true AND EXISTS (
      SELECT 1 FROM public.group_members gm 
      WHERE gm.conversation_id = conversations.id AND gm.user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can create direct conversations"
  ON public.conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (is_group = false AND auth.uid() = participant_1)
    OR 
    (is_group = true AND auth.uid() = created_by)
  );

CREATE POLICY "Users can update their conversations"
  ON public.conversations
  FOR UPDATE
  TO authenticated
  USING (
    (is_group = false AND (auth.uid() = participant_1 OR auth.uid() = participant_2))
    OR 
    (is_group = true AND EXISTS (
      SELECT 1 FROM public.group_members gm 
      WHERE gm.conversation_id = conversations.id AND gm.user_id = auth.uid() AND gm.is_admin = true
    ))
  );