
-- Add coach_notes to coaching_sessions
ALTER TABLE public.coaching_sessions ADD COLUMN IF NOT EXISTS coach_notes text;

-- Add scheduling columns to coaching_participations
ALTER TABLE public.coaching_participations ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;
ALTER TABLE public.coaching_participations ADD COLUMN IF NOT EXISTS location_name text;
ALTER TABLE public.coaching_participations ADD COLUMN IF NOT EXISTS location_lat numeric;
ALTER TABLE public.coaching_participations ADD COLUMN IF NOT EXISTS location_lng numeric;
ALTER TABLE public.coaching_participations ADD COLUMN IF NOT EXISTS map_session_id uuid;

-- Add coaching_session_id to sessions for back-link
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS coaching_session_id uuid REFERENCES public.coaching_sessions(id) ON DELETE SET NULL;
