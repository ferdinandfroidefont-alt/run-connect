
-- ============================================
-- 1. TABLE session_ratings + RLS + trigger
-- ============================================
CREATE TABLE public.session_ratings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL,
  organizer_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text CHECK (char_length(comment) <= 200),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(session_id, reviewer_id)
);

ALTER TABLE public.session_ratings ENABLE ROW LEVEL SECURITY;

-- INSERT: only confirmed GPS participants, not the organizer
CREATE POLICY "Participants can rate sessions"
ON public.session_ratings FOR INSERT
WITH CHECK (
  auth.uid() = reviewer_id
  AND auth.uid() <> organizer_id
  AND EXISTS (
    SELECT 1 FROM public.session_participants sp
    WHERE sp.session_id = session_ratings.session_id
    AND sp.user_id = auth.uid()
    AND sp.confirmed_by_gps = true
  )
);

-- SELECT: any authenticated user
CREATE POLICY "Anyone can view ratings"
ON public.session_ratings FOR SELECT
USING (auth.uid() IS NOT NULL);

-- ============================================
-- 2. ADD organizer_avg_rating to profiles
-- ============================================
ALTER TABLE public.profiles ADD COLUMN organizer_avg_rating numeric DEFAULT NULL;

-- Trigger to recalculate average rating
CREATE OR REPLACE FUNCTION public.update_organizer_avg_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET organizer_avg_rating = (
    SELECT ROUND(AVG(rating)::numeric, 2)
    FROM public.session_ratings
    WHERE organizer_id = NEW.organizer_id
  )
  WHERE user_id = NEW.organizer_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_avg_rating_on_insert
AFTER INSERT ON public.session_ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_organizer_avg_rating();

-- ============================================
-- 3. ALTER sessions for live tracking
-- ============================================
ALTER TABLE public.sessions
  ADD COLUMN live_tracking_enabled boolean DEFAULT false,
  ADD COLUMN live_tracking_active boolean DEFAULT false,
  ADD COLUMN live_tracking_started_at timestamp with time zone,
  ADD COLUMN live_tracking_max_duration integer DEFAULT 120;

-- ============================================
-- 4. TABLE live_tracking_points + RLS + INDEX
-- ============================================
CREATE TABLE public.live_tracking_points (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  accuracy numeric,
  recorded_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.live_tracking_points ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_live_tracking_session_time
ON public.live_tracking_points (session_id, recorded_at DESC);

-- INSERT: only the session organizer
CREATE POLICY "Organizer can insert tracking points"
ON public.live_tracking_points FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = live_tracking_points.session_id
    AND s.organizer_id = auth.uid()
    AND s.live_tracking_active = true
  )
);

-- SELECT: only session participants
CREATE POLICY "Participants can view tracking points"
ON public.live_tracking_points FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.session_participants sp
    WHERE sp.session_id = live_tracking_points.session_id
    AND sp.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = live_tracking_points.session_id
    AND s.organizer_id = auth.uid()
  )
);

-- ============================================
-- 5. TABLE polls + RLS
-- ============================================
CREATE TABLE public.polls (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL,
  creator_id uuid NOT NULL,
  question text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;

-- INSERT: creator must be member of conversation
CREATE POLICY "Members can create polls"
ON public.polls FOR INSERT
WITH CHECK (
  auth.uid() = creator_id
  AND (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.conversation_id = polls.conversation_id
      AND gm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = polls.conversation_id
      AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
    )
  )
);

-- SELECT: conversation members
CREATE POLICY "Members can view polls"
ON public.polls FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.conversation_id = polls.conversation_id
    AND gm.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = polls.conversation_id
    AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
  )
);

-- UPDATE: conversation members (for voting)
CREATE POLICY "Members can vote on polls"
ON public.polls FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.conversation_id = polls.conversation_id
    AND gm.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = polls.conversation_id
    AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
  )
);

-- DELETE: only creator
CREATE POLICY "Creator can delete polls"
ON public.polls FOR DELETE
USING (auth.uid() = creator_id);

-- ============================================
-- 6. Streak auto-update trigger
-- ============================================
CREATE OR REPLACE FUNCTION public.update_streak_on_gps_confirm()
RETURNS TRIGGER AS $$
DECLARE
  current_week_start date;
  last_update date;
  current_streak integer;
BEGIN
  -- Only trigger when confirmed_by_gps changes to true
  IF NEW.confirmed_by_gps = true AND (OLD.confirmed_by_gps IS NULL OR OLD.confirmed_by_gps = false) THEN
    current_week_start := date_trunc('week', now())::date;
    
    -- Get current streak info
    SELECT streak_weeks, last_streak_update INTO current_streak, last_update
    FROM public.user_stats
    WHERE user_id = NEW.user_id;
    
    IF NOT FOUND THEN
      -- Create user_stats if not exists
      INSERT INTO public.user_stats (user_id, streak_weeks, last_streak_update, total_sessions_completed)
      VALUES (NEW.user_id, 1, current_week_start, 1);
    ELSIF last_update IS NULL OR last_update < current_week_start THEN
      -- Check if last update was previous week (continue streak) or older (reset)
      IF last_update = current_week_start - interval '7 days' THEN
        UPDATE public.user_stats
        SET streak_weeks = COALESCE(streak_weeks, 0) + 1,
            last_streak_update = current_week_start,
            total_sessions_completed = COALESCE(total_sessions_completed, 0) + 1,
            updated_at = now()
        WHERE user_id = NEW.user_id;
      ELSE
        UPDATE public.user_stats
        SET streak_weeks = 1,
            last_streak_update = current_week_start,
            total_sessions_completed = COALESCE(total_sessions_completed, 0) + 1,
            updated_at = now()
        WHERE user_id = NEW.user_id;
      END IF;
    ELSE
      -- Already updated this week, just increment sessions
      UPDATE public.user_stats
      SET total_sessions_completed = COALESCE(total_sessions_completed, 0) + 1,
          updated_at = now()
      WHERE user_id = NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER streak_update_on_gps
AFTER UPDATE ON public.session_participants
FOR EACH ROW
EXECUTE FUNCTION public.update_streak_on_gps_confirm();

-- Enable realtime for live tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_tracking_points;
