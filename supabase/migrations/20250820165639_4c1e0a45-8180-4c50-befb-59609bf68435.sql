-- Add club_id column to sessions table to link sessions to clubs
ALTER TABLE public.sessions
ADD COLUMN club_id uuid REFERENCES public.conversations(id);

-- Add index for better performance when filtering by club
CREATE INDEX idx_sessions_club_id ON public.sessions(club_id);