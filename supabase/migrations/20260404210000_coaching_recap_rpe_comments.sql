-- RPE ressenti athlète (par phase, JSON)
ALTER TABLE public.coaching_participations
  ADD COLUMN IF NOT EXISTS athlete_rpe_felt jsonb;

COMMENT ON COLUMN public.coaching_participations.athlete_rpe_felt IS
  'RPE ressenti 1–10 par phase : { "warmup"?, "main"?, "cooldown"? }';

-- Commentaires coach / athlète liés à une séance
CREATE TABLE IF NOT EXISTS public.coaching_session_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coaching_session_id uuid NOT NULL REFERENCES public.coaching_sessions (id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  message text NOT NULL CHECK (char_length(message) > 0 AND char_length(message) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS coaching_session_comments_session_created_idx
  ON public.coaching_session_comments (coaching_session_id, created_at DESC);

ALTER TABLE public.coaching_session_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coaching_session_comments_select"
  ON public.coaching_session_comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.coaching_sessions cs
      WHERE cs.id = coaching_session_comments.coaching_session_id
        AND (
          cs.coach_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.coaching_participations p
            WHERE p.coaching_session_id = cs.id AND p.user_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM public.group_members gm
            WHERE gm.conversation_id = cs.club_id AND gm.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "coaching_session_comments_insert"
  ON public.coaching_session_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.coaching_sessions cs
      WHERE cs.id = coaching_session_comments.coaching_session_id
        AND (
          cs.coach_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.coaching_participations p
            WHERE p.coaching_session_id = cs.id AND p.user_id = auth.uid()
          )
        )
    )
  );
