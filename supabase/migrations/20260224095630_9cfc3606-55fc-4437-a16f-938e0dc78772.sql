
-- Table for saved week templates
CREATE TABLE public.coaching_week_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL,
  name TEXT NOT NULL,
  sessions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.coaching_week_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can view their own templates"
ON public.coaching_week_templates FOR SELECT
USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can create their own templates"
ON public.coaching_week_templates FOR INSERT
WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Coaches can delete their own templates"
ON public.coaching_week_templates FOR DELETE
USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can update their own templates"
ON public.coaching_week_templates FOR UPDATE
USING (auth.uid() = coach_id);
