-- Add pace and interval training fields to sessions table
ALTER TABLE public.sessions 
ADD COLUMN pace_general TEXT NULL,
ADD COLUMN interval_distance NUMERIC(5,2) NULL,
ADD COLUMN interval_pace TEXT NULL,
ADD COLUMN interval_count INTEGER NULL;

-- Add comments to explain the columns
COMMENT ON COLUMN public.sessions.pace_general IS 'Allure générale pour footing/sortie longue (format mm:ss/km)';
COMMENT ON COLUMN public.sessions.interval_distance IS 'Distance de chaque fraction en km (pour fractionné)';
COMMENT ON COLUMN public.sessions.interval_pace IS 'Allure de chaque fraction (format mm:ss/km)';
COMMENT ON COLUMN public.sessions.interval_count IS 'Nombre de fractions (pour fractionné)';