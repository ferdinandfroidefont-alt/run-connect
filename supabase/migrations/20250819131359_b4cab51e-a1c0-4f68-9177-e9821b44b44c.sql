-- Nettoyer d'abord les demandes orphelines (sessions supprimées)
DELETE FROM session_requests 
WHERE session_id NOT IN (SELECT id FROM sessions);

-- Nettoyer les notifications orphelines (corriger le type)
DELETE FROM notifications 
WHERE type = 'session_request' 
AND (data->>'session_id')::uuid NOT IN (SELECT id FROM sessions);

-- Améliorer la politique pour être plus robuste
DROP POLICY IF EXISTS "session_participants_insert" ON public.session_participants;

CREATE POLICY "session_participants_insert"
  ON public.session_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Users can add themselves if they have an accepted request OR if the session is public
    (auth.uid() = user_id AND (
      EXISTS (
        SELECT 1 FROM session_requests sr 
        WHERE sr.session_id = session_participants.session_id 
        AND sr.user_id = auth.uid() 
        AND sr.status = 'accepted'
      )
      OR EXISTS (
        SELECT 1 FROM sessions s 
        WHERE s.id = session_participants.session_id 
        AND s.is_private = false
      )
    ))
    OR
    -- Organizers can add anyone to their sessions (if session exists)
    (auth.uid() != user_id AND EXISTS (
      SELECT 1 FROM sessions s 
      WHERE s.id = session_participants.session_id 
      AND s.organizer_id = auth.uid()
    ))
  );