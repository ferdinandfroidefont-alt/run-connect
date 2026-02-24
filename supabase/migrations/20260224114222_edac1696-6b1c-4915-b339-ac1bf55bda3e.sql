
-- Fix SELECT policy on club_groups to allow creator/coach
DROP POLICY IF EXISTS "Club members can view groups" ON club_groups;
CREATE POLICY "Club members can view groups" ON club_groups
  FOR SELECT TO public
  USING (is_club_member(auth.uid(), club_id) OR is_club_coach_or_creator(auth.uid(), club_id));

-- Fix SELECT policy on club_group_members similarly
DROP POLICY IF EXISTS "Club members can view group members" ON club_group_members;
CREATE POLICY "Club members can view group members" ON club_group_members
  FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM club_groups cg
      WHERE cg.id = group_id
      AND (is_club_member(auth.uid(), cg.club_id) OR is_club_coach_or_creator(auth.uid(), cg.club_id))
    )
  );
