ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS visibility_tier text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS visibility_radius_km integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS boost_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS boost_consumed_at timestamptz,
  ADD COLUMN IF NOT EXISTS boost_notification_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS discovery_score numeric NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sessions_visibility_tier_check'
  ) THEN
    ALTER TABLE public.sessions
      ADD CONSTRAINT sessions_visibility_tier_check
      CHECK (visibility_tier IN ('free', 'boost', 'premium'));
  END IF;
END $$;

UPDATE public.sessions
SET
  visibility_tier = CASE
    WHEN visibility_type = 'public' THEN 'premium'
    ELSE 'free'
  END,
  visibility_radius_km = CASE
    WHEN visibility_type = 'public' THEN 999999
    ELSE 5
  END,
  discovery_score = CASE
    WHEN visibility_type = 'public' THEN 10
    ELSE 0
  END
WHERE visibility_tier = 'free'
  AND visibility_radius_km = 5
  AND discovery_score = 0;

CREATE INDEX IF NOT EXISTS sessions_visibility_tier_idx
  ON public.sessions (visibility_tier, scheduled_at);

CREATE INDEX IF NOT EXISTS sessions_boost_expires_at_idx
  ON public.sessions (boost_expires_at)
  WHERE boost_expires_at IS NOT NULL;

COMMENT ON COLUMN public.sessions.visibility_tier IS
  'Tier de visibilité: free (5km), boost (25km temporaire), premium (illimité)';

COMMENT ON COLUMN public.sessions.visibility_radius_km IS
  'Rayon de visibilité effectif snapshoté pour lecture rapide';

COMMENT ON COLUMN public.sessions.discovery_score IS
  'Score de priorité temporaire pour le feed local / découverte';
