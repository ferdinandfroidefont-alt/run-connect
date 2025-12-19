-- ========================================
-- CREATE RATE_LIMITS TABLE AND POLICIES
-- ========================================

-- Create rate_limits table if not exists
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action_type text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action_created 
ON public.rate_limits (user_id, action_type, created_at);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rate_limits
CREATE POLICY "Users can view their own rate limits"
ON public.rate_limits
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rate limits"
ON public.rate_limits
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow deletion of old entries (cleanup)
CREATE POLICY "Users can delete their own rate limits"
ON public.rate_limits
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ========================================
-- ADD MISSING INSERT POLICIES FOR user_challenges, user_badges, etc.
-- ========================================

-- user_challenges: INSERT policy
CREATE POLICY "Users can insert their own challenges"
ON public.user_challenges
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- user_challenges: UPDATE policy
CREATE POLICY "Users can update their own challenges"
ON public.user_challenges
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- user_badges: INSERT policy
CREATE POLICY "Users can insert their own badges"
ON public.user_badges
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- challenge_history: INSERT policy
CREATE POLICY "Users can insert their own history"
ON public.challenge_history
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- user_stats: INSERT policy
CREATE POLICY "Users can insert their own stats"
ON public.user_stats
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- session_participants: UPDATE policies
CREATE POLICY "Participants can update their own participation"
ON public.session_participants
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Organizers can update session participants"
ON public.session_participants
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM sessions s 
    WHERE s.id = session_id 
    AND s.organizer_id = auth.uid()
  )
);

-- subscribers: DELETE policy (GDPR)
CREATE POLICY "Users can delete their own subscription"
ON public.subscribers
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- profiles: DELETE policy (GDPR)
CREATE POLICY "Users can delete their own profile"
ON public.profiles
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- notification_logs: policies for owner access
CREATE POLICY "Users can view their own notification logs"
ON public.notification_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notification logs"
ON public.notification_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- ========================================
-- SECURE CHALLENGES TABLE - authenticated only
-- ========================================
DROP POLICY IF EXISTS "Challenges are viewable by everyone" ON public.challenges;

CREATE POLICY "Authenticated users can view challenges"
ON public.challenges
FOR SELECT
TO authenticated
USING (true);