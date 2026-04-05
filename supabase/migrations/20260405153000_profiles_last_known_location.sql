ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_known_lat numeric,
  ADD COLUMN IF NOT EXISTS last_known_lng numeric,
  ADD COLUMN IF NOT EXISTS last_known_location_at timestamptz;

CREATE INDEX IF NOT EXISTS profiles_last_known_location_at_idx
  ON public.profiles (last_known_location_at DESC)
  WHERE last_known_location_at IS NOT NULL;

COMMENT ON COLUMN public.profiles.last_known_lat IS
  'Dernière latitude connue utile pour ciblage local des notifications';

COMMENT ON COLUMN public.profiles.last_known_lng IS
  'Dernière longitude connue utile pour ciblage local des notifications';

COMMENT ON COLUMN public.profiles.last_known_location_at IS
  'Horodatage de la dernière position enregistrée côté app';
