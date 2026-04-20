
CREATE TABLE public.session_stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  media_url TEXT,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours')
);

ALTER TABLE public.session_stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all stories" ON public.session_stories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own stories" ON public.session_stories FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "Users can delete own stories" ON public.session_stories FOR DELETE TO authenticated USING (author_id = auth.uid());

CREATE TABLE public.profile_story_highlights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  story_id UUID REFERENCES public.session_stories(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT 'À la une',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_story_highlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view highlights" ON public.profile_story_highlights FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage own highlights" ON public.profile_story_highlights FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own highlights" ON public.profile_story_highlights FOR UPDATE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Users can delete own highlights" ON public.profile_story_highlights FOR DELETE TO authenticated USING (owner_id = auth.uid());
