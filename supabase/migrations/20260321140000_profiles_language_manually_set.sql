-- Priorité du choix manuel de langue vs suggestion pays
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS language_manually_set boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.language_manually_set IS 'Si true, la langue ne doit plus être changée automatiquement selon le pays.';
