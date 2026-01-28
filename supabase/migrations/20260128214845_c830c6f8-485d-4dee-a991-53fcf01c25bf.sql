-- Add calculated_level column to sessions table
-- Level 1-6: Débutant, Loisir, Intermédiaire, Avancé, Performance, Élite
ALTER TABLE public.sessions ADD COLUMN calculated_level integer DEFAULT 3;

-- Add constraint to ensure level is between 1 and 6
ALTER TABLE public.sessions ADD CONSTRAINT sessions_calculated_level_check CHECK (calculated_level >= 1 AND calculated_level <= 6);

-- Create index for efficient filtering by level
CREATE INDEX idx_sessions_calculated_level ON public.sessions(calculated_level);