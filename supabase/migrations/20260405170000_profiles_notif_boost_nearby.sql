ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notif_boost_nearby boolean DEFAULT true;

COMMENT ON COLUMN public.profiles.notif_boost_nearby IS
  'Recevoir une notification quand une séance boostée démarre bientôt près de la dernière position connue';
