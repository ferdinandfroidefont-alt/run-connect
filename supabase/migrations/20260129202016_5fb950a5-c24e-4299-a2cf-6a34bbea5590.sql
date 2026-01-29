-- Add session_blocks JSONB column for structured sessions
ALTER TABLE public.sessions ADD COLUMN session_blocks jsonb DEFAULT NULL;

-- Add session_mode column (simple or structured)
ALTER TABLE public.sessions ADD COLUMN session_mode text DEFAULT 'simple';

-- Add comment for documentation
COMMENT ON COLUMN public.sessions.session_blocks IS 'JSON array of session blocks for structured workouts (warmup, intervals, cooldown)';
COMMENT ON COLUMN public.sessions.session_mode IS 'Session mode: simple (basic workout) or structured (blocks-based workout)';