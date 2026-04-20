-- Rappel organisateur : un participant demande que sa présence soit confirmée (anti-spam : une fois par couple séance/participant)

CREATE TABLE IF NOT EXISTS public.session_presence_reminder_sent (
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  participant_user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, participant_user_id)
);

ALTER TABLE public.session_presence_reminder_sent ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.request_session_presence_reminder(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_title text;
  v_participant_label text;
  v_inserted uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT organizer_id, title INTO v_org, v_title
  FROM public.sessions
  WHERE id = p_session_id;

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  IF v_org = auth.uid() THEN
    RAISE EXCEPTION 'Organizer cannot request reminder for self';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.session_participants sp
    WHERE sp.session_id = p_session_id AND sp.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;

  INSERT INTO public.session_presence_reminder_sent (session_id, participant_user_id)
  VALUES (p_session_id, auth.uid())
  ON CONFLICT (session_id, participant_user_id) DO NOTHING
  RETURNING session_id INTO v_inserted;

  IF v_inserted IS NULL THEN
    RAISE EXCEPTION 'already_sent' USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(NULLIF(TRIM(display_name), ''), username, 'Un participant')
  INTO v_participant_label
  FROM public.profiles
  WHERE user_id = auth.uid();

  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    v_org,
    'session_presence_reminder',
    'Confirmer une présence',
    format('%s souhaite que vous confirmiez sa présence sur « %s ».', v_participant_label, COALESCE(v_title, 'la séance')),
    jsonb_build_object(
      'session_id', p_session_id,
      'participant_id', auth.uid()
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_session_presence_reminder(uuid) TO authenticated;

COMMENT ON FUNCTION public.request_session_presence_reminder(uuid) IS
  'Envoie une notification à l’organisateur pour confirmer la présence du participant (une fois par séance).';
