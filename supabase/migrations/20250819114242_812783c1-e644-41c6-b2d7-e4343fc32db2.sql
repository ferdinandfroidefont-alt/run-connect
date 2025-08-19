-- Fix recursive RLS policies for group_members that prevent conversation loading
-- Drop all existing policies that may cause recursion
DROP POLICY IF EXISTS "Admins can insert members into their groups" ON public.group_members;
DROP POLICY IF EXISTS "Group admins can remove members" ON public.group_members;
DROP POLICY IF EXISTS "Group admins can update member roles" ON public.group_members;
DROP POLICY IF EXISTS "Users can insert themselves into groups" ON public.group_members;
DROP POLICY IF EXISTS "Users can view members of groups they belong to" ON public.group_members;

-- Create simple, non-recursive policies
CREATE POLICY "Users can view group members they belong to"
  ON public.group_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR 
    conversation_id IN (
      SELECT id FROM public.conversations 
      WHERE created_by = auth.uid() AND is_group = true
    )
  );

CREATE POLICY "Users can insert themselves into groups"
  ON public.group_members
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Group creators can insert members"
  ON public.group_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM public.conversations 
      WHERE created_by = auth.uid() AND is_group = true
    )
  );

CREATE POLICY "Users can leave groups"
  ON public.group_members
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Group creators can remove members"
  ON public.group_members
  FOR DELETE
  TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM public.conversations 
      WHERE created_by = auth.uid() AND is_group = true
    )
  );

CREATE POLICY "Group creators can update member roles"
  ON public.group_members
  FOR UPDATE
  TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM public.conversations 
      WHERE created_by = auth.uid() AND is_group = true
    )
  );