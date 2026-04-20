
CREATE TABLE public.restricted_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restricter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restricted_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (restricter_id, restricted_id)
);

ALTER TABLE public.restricted_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own restrictions"
ON public.restricted_users FOR SELECT
USING (auth.uid() = restricter_id);

CREATE POLICY "Users can create restrictions"
ON public.restricted_users FOR INSERT
WITH CHECK (auth.uid() = restricter_id);

CREATE POLICY "Users can remove their own restrictions"
ON public.restricted_users FOR DELETE
USING (auth.uid() = restricter_id);
