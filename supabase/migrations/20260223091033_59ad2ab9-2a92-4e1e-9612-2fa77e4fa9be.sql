-- Allow participants to insert their tracking points
CREATE POLICY "Participants can insert tracking points"
ON live_tracking_points FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM session_participants sp
    WHERE sp.session_id = live_tracking_points.session_id
    AND sp.user_id = auth.uid()
  )
);