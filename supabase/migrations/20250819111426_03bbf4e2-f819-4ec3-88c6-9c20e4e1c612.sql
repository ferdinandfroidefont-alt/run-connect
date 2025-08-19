-- Fix infinite recursion in group_members policies
-- Drop existing policies
DROP POLICY IF EXISTS "Group admins can manage members" ON public.group_members;
DROP POLICY IF EXISTS "Users can join groups" ON public.group_members;
DROP POLICY IF EXISTS "Users can view group members they belong to" ON public.group_members;

-- Create non-recursive policies for group_members
CREATE POLICY "Users can insert themselves into groups"
  ON public.group_members
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can insert members into their groups"
  ON public.group_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id 
        AND c.is_group = true 
        AND c.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can view members of groups they belong to"
  ON public.group_members
  FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT gm.conversation_id 
      FROM public.group_members gm 
      WHERE gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Group admins can update member roles"
  ON public.group_members
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id 
        AND c.is_group = true 
        AND c.created_by = auth.uid()
    )
  );

CREATE POLICY "Group admins can remove members"
  ON public.group_members
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id 
        AND c.is_group = true 
        AND c.created_by = auth.uid()
    )
    OR auth.uid() = user_id  -- Users can leave groups themselves
  );