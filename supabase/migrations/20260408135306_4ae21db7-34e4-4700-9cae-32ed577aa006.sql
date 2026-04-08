
CREATE TABLE public.profile_sport_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sport_key TEXT NOT NULL,
  event_label TEXT NOT NULL,
  record_value TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_sport_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own records"
  ON public.profile_sport_records FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own records"
  ON public.profile_sport_records FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own records"
  ON public.profile_sport_records FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own records"
  ON public.profile_sport_records FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Anyone can view records for public profiles"
  ON public.profile_sport_records FOR SELECT
  TO authenticated
  USING (true);
