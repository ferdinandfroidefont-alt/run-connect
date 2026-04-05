-- Records sport personnalisés (sport + épreuve + valeur), visibles sur le profil public.

CREATE TABLE public.profile_sport_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  sport_key text NOT NULL CHECK (
    sport_key = ANY (
      ARRAY[
        'running'::text,
        'cycling'::text,
        'swimming'::text,
        'triathlon'::text,
        'walking'::text,
        'other'::text
      ]
    )
  ),
  event_label text NOT NULL,
  record_value text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_profile_sport_records_user_id ON public.profile_sport_records (user_id);
CREATE INDEX idx_profile_sport_records_user_sort ON public.profile_sport_records (user_id, sort_order, created_at);

ALTER TABLE public.profile_sport_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profile_sport_records_select_all"
  ON public.profile_sport_records
  FOR SELECT
  USING (true);

CREATE POLICY "profile_sport_records_insert_own"
  ON public.profile_sport_records
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profile_sport_records_update_own"
  ON public.profile_sport_records
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "profile_sport_records_delete_own"
  ON public.profile_sport_records
  FOR DELETE
  USING (auth.uid() = user_id);
