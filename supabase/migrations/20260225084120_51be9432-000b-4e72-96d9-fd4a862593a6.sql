
-- Create coaching_drafts table for persistent draft storage
CREATE TABLE public.coaching_drafts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id uuid NOT NULL,
  club_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  group_id text NOT NULL DEFAULT 'club',
  sessions jsonb NOT NULL DEFAULT '[]'::jsonb,
  target_athletes uuid[] NOT NULL DEFAULT '{}'::uuid[],
  sent_at timestamptz DEFAULT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT coaching_drafts_unique UNIQUE (coach_id, club_id, week_start, group_id)
);

-- Enable RLS
ALTER TABLE public.coaching_drafts ENABLE ROW LEVEL SECURITY;

-- RLS: coaches can only access their own drafts
CREATE POLICY "Coaches can view their own drafts"
  ON public.coaching_drafts FOR SELECT
  USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can create their own drafts"
  ON public.coaching_drafts FOR INSERT
  WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Coaches can update their own drafts"
  ON public.coaching_drafts FOR UPDATE
  USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can delete their own drafts"
  ON public.coaching_drafts FOR DELETE
  USING (auth.uid() = coach_id);

-- Auto-update updated_at
CREATE TRIGGER update_coaching_drafts_updated_at
  BEFORE UPDATE ON public.coaching_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
