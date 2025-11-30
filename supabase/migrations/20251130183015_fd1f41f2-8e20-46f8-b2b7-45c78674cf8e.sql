-- Créer table session_likes
CREATE TABLE IF NOT EXISTS public.session_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_session_likes_session_id ON public.session_likes(session_id);
CREATE INDEX IF NOT EXISTS idx_session_likes_user_id ON public.session_likes(user_id);

-- RLS pour session_likes
ALTER TABLE public.session_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can like sessions"
ON public.session_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike sessions"
ON public.session_likes FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can view likes"
ON public.session_likes FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Créer table session_comments
CREATE TABLE IF NOT EXISTS public.session_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_session_comments_session_id ON public.session_comments(session_id);
CREATE INDEX IF NOT EXISTS idx_session_comments_user_id ON public.session_comments(user_id);

-- RLS pour session_comments
ALTER TABLE public.session_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can add comments"
ON public.session_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view comments"
ON public.session_comments FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own comments"
ON public.session_comments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
ON public.session_comments FOR DELETE
USING (auth.uid() = user_id);

-- Trigger pour updated_at sur session_comments
CREATE TRIGGER update_session_comments_updated_at
BEFORE UPDATE ON public.session_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();