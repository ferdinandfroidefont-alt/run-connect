-- Drop the problematic policy that still causes infinite recursion
DROP POLICY IF EXISTS "Members can view group members" ON public.group_members;

-- Create a security definer function to get user's group conversations
CREATE OR REPLACE FUNCTION public.get_user_group_conversations(user_id_param uuid)
RETURNS TABLE(conversation_id uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT gm.conversation_id
  FROM group_members gm
  WHERE gm.user_id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create the fixed policy using the security definer function
CREATE POLICY "Members can view group members" 
ON public.group_members 
FOR SELECT 
USING (
  conversation_id IN (
    SELECT gc.conversation_id 
    FROM get_user_group_conversations(auth.uid()) gc
  )
);