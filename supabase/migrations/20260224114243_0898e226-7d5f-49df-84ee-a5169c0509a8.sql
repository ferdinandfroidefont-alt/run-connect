
-- Fix SELECT policy on coaching_sessions to allow creator/coach
DROP POLICY IF EXISTS "Club members can view coaching sessions" ON coaching_sessions;
CREATE POLICY "Club members can view coaching sessions" ON coaching_sessions
  FOR SELECT TO public
  USING (is_club_member(auth.uid(), club_id) OR is_club_coach_or_creator(auth.uid(), club_id));

-- Fix SELECT policy on coaching_participations
DROP POLICY IF EXISTS "Athletes can view their participations" ON coaching_participations;
CREATE POLICY "Athletes can view their participations" ON coaching_participations
  FOR SELECT TO public
  USING (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM coaching_sessions cs
      WHERE cs.id = coaching_session_id
      AND is_club_coach_or_creator(auth.uid(), cs.club_id)
    )
  );
