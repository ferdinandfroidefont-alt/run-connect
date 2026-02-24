
-- 1. Create coaching_templates table
CREATE TABLE public.coaching_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  name text NOT NULL,
  rcc_code text NOT NULL,
  activity_type text DEFAULT 'running',
  objective text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.coaching_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can view their own templates"
ON public.coaching_templates FOR SELECT
TO authenticated
USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can create their own templates"
ON public.coaching_templates FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Coaches can update their own templates"
ON public.coaching_templates FOR UPDATE
TO authenticated
USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can delete their own templates"
ON public.coaching_templates FOR DELETE
TO authenticated
USING (auth.uid() = coach_id);

-- 2. Add columns to coaching_sessions
ALTER TABLE public.coaching_sessions
  ADD COLUMN IF NOT EXISTS rcc_code text,
  ADD COLUMN IF NOT EXISTS objective text,
  ADD COLUMN IF NOT EXISTS default_location_name text,
  ADD COLUMN IF NOT EXISTS default_location_lat numeric,
  ADD COLUMN IF NOT EXISTS default_location_lng numeric;

-- 3. Add athlete_overrides to coaching_participations
ALTER TABLE public.coaching_participations
  ADD COLUMN IF NOT EXISTS athlete_overrides jsonb DEFAULT '{}';
