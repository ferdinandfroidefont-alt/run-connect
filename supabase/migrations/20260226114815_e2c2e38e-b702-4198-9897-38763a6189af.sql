
-- 1. Create SECURITY DEFINER function to check group creator
CREATE OR REPLACE FUNCTION public.is_group_creator(_user_id uuid, _conversation_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversations
    WHERE id = _conversation_id AND created_by = _user_id AND is_group = true
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_group_creator FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_group_creator TO authenticated;

-- 2. Drop and recreate UPDATE policy
DROP POLICY IF EXISTS "Group creators can update member roles" ON group_members;
CREATE POLICY "Group creators can update member roles" ON group_members
  FOR UPDATE TO authenticated
  USING (is_group_creator(auth.uid(), conversation_id));

-- 3. Drop and recreate INSERT policy that references conversations
DROP POLICY IF EXISTS "Group creators can add members" ON group_members;
CREATE POLICY "Group creators can add members" ON group_members
  FOR INSERT TO authenticated
  WITH CHECK (is_group_creator(auth.uid(), conversation_id));

-- 4. Drop and recreate DELETE policy that references conversations
DROP POLICY IF EXISTS "Group creators can remove members" ON group_members;
CREATE POLICY "Group creators can remove members" ON group_members
  FOR DELETE TO authenticated
  USING (is_group_creator(auth.uid(), conversation_id));
