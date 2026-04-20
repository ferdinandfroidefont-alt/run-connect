-- RPE par phase (planification coach) : échauffement, corps de séance, récup finale
ALTER TABLE public.coaching_sessions
  ADD COLUMN IF NOT EXISTS rpe_phases jsonb DEFAULT NULL;

COMMENT ON COLUMN public.coaching_sessions.rpe_phases IS
  'RPE 1–10 par phase: {"warmup":n,"main":n,"cooldown":n}. Colonne rpe = moyenne (stats / rétrocompat).';
