
DROP POLICY "Members can register for coaching sessions" ON coaching_participations;

CREATE POLICY "Coaches or self can insert participations"
ON coaching_participations FOR INSERT TO authenticated
WITH CHECK (
  -- Self-registration
  (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM coaching_sessions cs
    WHERE cs.id = coaching_session_id AND is_club_member(auth.uid(), cs.club_id)
  ))
  OR
  -- Coach inserting for athletes
  EXISTS (
    SELECT 1 FROM coaching_sessions cs
    WHERE cs.id = coaching_session_id AND is_club_coach(auth.uid(), cs.club_id)
  )
);
