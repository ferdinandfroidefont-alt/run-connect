
-- Table pour les objectifs personnels des utilisateurs
CREATE TABLE public.user_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  goal_type TEXT NOT NULL, -- 'sessions_joined', 'sessions_created', 'points', 'distance_km'
  target_value INTEGER NOT NULL,
  current_value INTEGER NOT NULL DEFAULT 0,
  period TEXT NOT NULL DEFAULT 'monthly', -- 'weekly', 'monthly', 'seasonal'
  period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT date_trunc('month', now()),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;

-- Users can see their own goals
CREATE POLICY "Users can view their own goals"
ON public.user_goals FOR SELECT
USING (auth.uid()::text = user_id);

-- Users can create their own goals
CREATE POLICY "Users can create their own goals"
ON public.user_goals FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

-- Users can update their own goals
CREATE POLICY "Users can update their own goals"
ON public.user_goals FOR UPDATE
USING (auth.uid()::text = user_id);

-- Users can delete their own goals
CREATE POLICY "Users can delete their own goals"
ON public.user_goals FOR DELETE
USING (auth.uid()::text = user_id);

-- Index for fast lookup
CREATE INDEX idx_user_goals_user_id ON public.user_goals(user_id);
CREATE INDEX idx_user_goals_period ON public.user_goals(user_id, period, period_start);

-- Trigger for updated_at
CREATE TRIGGER update_user_goals_updated_at
BEFORE UPDATE ON public.user_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
