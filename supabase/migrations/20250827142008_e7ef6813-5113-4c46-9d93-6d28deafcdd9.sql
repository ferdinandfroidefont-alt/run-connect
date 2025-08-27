-- Add pace_unit column to sessions table
ALTER TABLE public.sessions 
ADD COLUMN pace_unit text DEFAULT 'speed';

-- Add comment to explain the values
COMMENT ON COLUMN public.sessions.pace_unit IS 'Unit for pace: "speed" (km/h or min:sec) or "power" (watts) for cycling';

-- Update interval_pace_unit column too for consistency  
ALTER TABLE public.sessions 
ADD COLUMN interval_pace_unit text DEFAULT 'speed';