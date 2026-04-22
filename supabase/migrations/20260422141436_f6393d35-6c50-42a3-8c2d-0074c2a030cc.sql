CREATE TABLE public.coach_athlete_private_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID NOT NULL,
  athlete_user_id UUID NOT NULL,
  club_id UUID NOT NULL,
  sport_key TEXT NOT NULL DEFAULT 'running',
  event_label TEXT NOT NULL,
  record_value TEXT NOT NULL,
  note TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT coach_athlete_private_records_unique UNIQUE (coach_id, athlete_user_id, club_id, sport_key, event_label)
);

CREATE INDEX idx_coach_private_records_athlete_club ON public.coach_athlete_private_records (athlete_user_id, club_id);
CREATE INDEX idx_coach_private_records_coach ON public.coach_athlete_private_records (coach_id);

ALTER TABLE public.coach_athlete_private_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach can view own private athlete records"
ON public.coach_athlete_private_records
FOR SELECT
TO authenticated
USING (
  auth.uid() = coach_id
  AND is_club_coach_or_creator(auth.uid(), club_id)
);

CREATE POLICY "Coach can create own private athlete records"
ON public.coach_athlete_private_records
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = coach_id
  AND is_club_coach_or_creator(auth.uid(), club_id)
);

CREATE POLICY "Coach can update own private athlete records"
ON public.coach_athlete_private_records
FOR UPDATE
TO authenticated
USING (
  auth.uid() = coach_id
  AND is_club_coach_or_creator(auth.uid(), club_id)
)
WITH CHECK (
  auth.uid() = coach_id
  AND is_club_coach_or_creator(auth.uid(), club_id)
);

CREATE POLICY "Coach can delete own private athlete records"
ON public.coach_athlete_private_records
FOR DELETE
TO authenticated
USING (
  auth.uid() = coach_id
  AND is_club_coach_or_creator(auth.uid(), club_id)
);

CREATE OR REPLACE FUNCTION public.update_coach_athlete_private_records_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_coach_athlete_private_records_updated_at
BEFORE UPDATE ON public.coach_athlete_private_records
FOR EACH ROW
EXECUTE FUNCTION public.update_coach_athlete_private_records_updated_at();