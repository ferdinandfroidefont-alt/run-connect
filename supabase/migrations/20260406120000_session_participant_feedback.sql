-- Retour participants après une séance (satisfaction + commentaire optionnel, distinct des notes organisateur)

CREATE TABLE IF NOT EXISTS public.session_participant_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  participant_user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  went_well boolean NOT NULL,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT session_participant_feedback_session_participant_unique UNIQUE (session_id, participant_user_id)
);

CREATE INDEX IF NOT EXISTS session_participant_feedback_session_id_idx
  ON public.session_participant_feedback (session_id);

CREATE INDEX IF NOT EXISTS session_participant_feedback_participant_idx
  ON public.session_participant_feedback (participant_user_id);

ALTER TABLE public.session_participant_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "spf_select_own_or_organizer" ON public.session_participant_feedback;
CREATE POLICY "spf_select_own_or_organizer"
  ON public.session_participant_feedback
  FOR SELECT
  TO authenticated
  USING (
    participant_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id AND s.organizer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "spf_insert_participant" ON public.session_participant_feedback;
CREATE POLICY "spf_insert_participant"
  ON public.session_participant_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (
    participant_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.session_participants sp
      WHERE sp.session_id = session_id
        AND sp.user_id = auth.uid()
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id
        AND s.organizer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "spf_update_own" ON public.session_participant_feedback;
CREATE POLICY "spf_update_own"
  ON public.session_participant_feedback
  FOR UPDATE
  TO authenticated
  USING (participant_user_id = auth.uid())
  WITH CHECK (participant_user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON public.session_participant_feedback TO authenticated;

COMMENT ON TABLE public.session_participant_feedback IS
  'Retour optionnel des participants après une séance (organisateur peut lire sur ses séances).';

-- Nombre de personnes suivies en commun (abonnements croisés)
CREATE OR REPLACE FUNCTION public.count_common_follows(user_a uuid, user_b uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM (
    SELECT following_id
    FROM public.user_follows
    WHERE follower_id = user_a AND status = 'accepted'
    INTERSECT
    SELECT following_id
    FROM public.user_follows
    WHERE follower_id = user_b AND status = 'accepted'
  ) t;
$$;

GRANT EXECUTE ON FUNCTION public.count_common_follows(uuid, uuid) TO authenticated;
