-- Fix RLS policy for session_participants to allow organizers to add approved participants
DROP POLICY IF EXISTS "Users can join sessions they're approved for" ON public.session_participants;

CREATE POLICY "Users can join sessions they're approved for" 
ON public.session_participants 
FOR INSERT 
WITH CHECK (
  -- Either the user is joining themselves (for public sessions or auto-accepted)
  (auth.uid() = user_id AND (
    -- User is the organizer of the session
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = session_participants.session_id 
      AND sessions.organizer_id = auth.uid()
    )
    OR
    -- User has an accepted request for this session
    EXISTS (
      SELECT 1 FROM session_requests 
      WHERE session_requests.session_id = session_participants.session_id 
      AND session_requests.user_id = auth.uid() 
      AND session_requests.status = 'accepted'
    )
    OR
    -- Session is public (not private)
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = session_participants.session_id 
      AND sessions.is_private = false
    )
  ))
  OR
  -- Or the organizer is adding someone who has an accepted request
  (auth.uid() != user_id AND 
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = session_participants.session_id 
      AND sessions.organizer_id = auth.uid()
    ) AND
    EXISTS (
      SELECT 1 FROM session_requests 
      WHERE session_requests.session_id = session_participants.session_id 
      AND session_requests.user_id = session_participants.user_id 
      AND session_requests.status = 'accepted'
    )
  )
);