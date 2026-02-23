
-- Add is_coach column to group_members
ALTER TABLE public.group_members ADD COLUMN is_coach boolean DEFAULT false;

-- Create coaching_sessions table
CREATE TABLE public.coaching_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  scheduled_at timestamp with time zone NOT NULL,
  activity_type text NOT NULL DEFAULT 'running',
  distance_km numeric,
  pace_target text,
  session_blocks jsonb,
  status text NOT NULL DEFAULT 'planned',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create coaching_participations table
CREATE TABLE public.coaching_participations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coaching_session_id uuid NOT NULL REFERENCES public.coaching_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'confirmed',
  feedback text,
  athlete_note text,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(coaching_session_id, user_id)
);

-- Enable RLS
ALTER TABLE public.coaching_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_participations ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user is member of club
CREATE OR REPLACE FUNCTION public.is_club_member(_user_id uuid, _club_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE user_id = _user_id AND conversation_id = _club_id
  )
$$;

-- Helper function: check if user is coach in club
CREATE OR REPLACE FUNCTION public.is_club_coach(_user_id uuid, _club_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE user_id = _user_id AND conversation_id = _club_id AND (is_coach = true OR is_admin = true)
  ) OR EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = _club_id AND created_by = _user_id
  )
$$;

-- RLS for coaching_sessions
CREATE POLICY "Club members can view coaching sessions"
ON public.coaching_sessions FOR SELECT
USING (public.is_club_member(auth.uid(), club_id));

CREATE POLICY "Coaches can create coaching sessions"
ON public.coaching_sessions FOR INSERT
WITH CHECK (public.is_club_coach(auth.uid(), club_id) AND auth.uid() = coach_id);

CREATE POLICY "Coaches can update their coaching sessions"
ON public.coaching_sessions FOR UPDATE
USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can delete their coaching sessions"
ON public.coaching_sessions FOR DELETE
USING (auth.uid() = coach_id);

-- RLS for coaching_participations
CREATE POLICY "Club members can view participations"
ON public.coaching_participations FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.coaching_sessions cs
  WHERE cs.id = coaching_participations.coaching_session_id
  AND public.is_club_member(auth.uid(), cs.club_id)
));

CREATE POLICY "Members can register for coaching sessions"
ON public.coaching_participations FOR INSERT
WITH CHECK (auth.uid() = user_id AND EXISTS (
  SELECT 1 FROM public.coaching_sessions cs
  WHERE cs.id = coaching_participations.coaching_session_id
  AND public.is_club_member(auth.uid(), cs.club_id)
));

CREATE POLICY "Athletes can update their own participation"
ON public.coaching_participations FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Coaches can update participation feedback"
ON public.coaching_participations FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.coaching_sessions cs
  WHERE cs.id = coaching_participations.coaching_session_id
  AND public.is_club_coach(auth.uid(), cs.club_id)
));

CREATE POLICY "Athletes can delete their participation"
ON public.coaching_participations FOR DELETE
USING (auth.uid() = user_id);
