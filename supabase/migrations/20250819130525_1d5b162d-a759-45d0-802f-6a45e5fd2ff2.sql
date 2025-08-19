-- Fix both conversation and session_participants RLS issues

-- 1. Fix conversations policies (again, with a completely different approach)
DROP POLICY IF EXISTS "conversations_select_simple" ON public.conversations;
DROP POLICY IF EXISTS "conversations_insert_simple" ON public.conversations;
DROP POLICY IF EXISTS "conversations_update_simple" ON public.conversations;

-- Simple direct policies for conversations without any subqueries
CREATE POLICY "conv_select"
  ON public.conversations
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = participant_1 OR 
    auth.uid() = participant_2 OR 
    auth.uid() = created_by
  );

CREATE POLICY "conv_insert"
  ON public.conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = participant_1 OR 
    auth.uid() = created_by
  );

CREATE POLICY "conv_update"
  ON public.conversations
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = participant_1 OR 
    auth.uid() = participant_2 OR 
    auth.uid() = created_by
  );

-- 2. Fix session_participants policies to allow organizers to add participants
DROP POLICY IF EXISTS "Users can join sessions they're approved for" ON public.session_participants;

CREATE POLICY "session_participants_insert"
  ON public.session_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Users can add themselves
    auth.uid() = user_id
    OR
    -- Organizers can add anyone to their sessions
    EXISTS (
      SELECT 1 FROM public.sessions s 
      WHERE s.id = session_participants.session_id 
      AND s.organizer_id = auth.uid()
    )
  );