-- Add distance_km column to sessions table
ALTER TABLE public.sessions 
ADD COLUMN distance_km NUMERIC(6,2) NULL;

-- Add comment to explain the column
COMMENT ON COLUMN public.sessions.distance_km IS 'Distance prévue de la séance en kilomètres';