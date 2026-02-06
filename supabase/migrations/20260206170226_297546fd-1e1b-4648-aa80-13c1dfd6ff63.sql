
-- Table pour stocker l'historique des scores (snapshots hebdomadaires)
CREATE TABLE public.score_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  total_points INTEGER NOT NULL DEFAULT 0,
  seasonal_points INTEGER NOT NULL DEFAULT 0,
  weekly_points INTEGER NOT NULL DEFAULT 0,
  rank INTEGER,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  week_start DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Index pour requêtes rapides par user + date
CREATE INDEX idx_score_history_user_date ON public.score_history (user_id, recorded_at DESC);
CREATE INDEX idx_score_history_week ON public.score_history (user_id, week_start);

-- Contrainte unique pour éviter les doublons par semaine
ALTER TABLE public.score_history ADD CONSTRAINT unique_user_week UNIQUE (user_id, week_start);

-- Enable RLS
ALTER TABLE public.score_history ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut voir l'historique (classement public)
CREATE POLICY "Anyone can view score history"
ON public.score_history
FOR SELECT
TO authenticated
USING (true);

-- Seul le système insère (via trigger/cron)
CREATE POLICY "System can insert score history"
ON public.score_history
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Fonction pour enregistrer un snapshot hebdomadaire de tous les scores
CREATE OR REPLACE FUNCTION public.record_weekly_score_snapshot()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_week DATE := date_trunc('week', CURRENT_DATE)::DATE;
BEGIN
  INSERT INTO public.score_history (user_id, total_points, seasonal_points, weekly_points, week_start, recorded_at)
  SELECT 
    us.user_id,
    COALESCE(us.total_points, 0),
    COALESCE(us.seasonal_points, 0),
    COALESCE(us.weekly_points, 0),
    current_week,
    now()
  FROM public.user_scores us
  ON CONFLICT (user_id, week_start) DO UPDATE SET
    total_points = EXCLUDED.total_points,
    seasonal_points = EXCLUDED.seasonal_points,
    weekly_points = EXCLUDED.weekly_points,
    recorded_at = now();
END;
$$;

-- Enregistrer un snapshot initial pour tous les utilisateurs existants
SELECT public.record_weekly_score_snapshot();
