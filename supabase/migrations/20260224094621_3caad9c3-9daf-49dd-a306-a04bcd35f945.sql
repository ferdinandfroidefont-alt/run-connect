
-- Club groups (e.g. Sprint, Demi-fond, Loisirs, Minimes)
CREATE TABLE public.club_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.club_groups ENABLE ROW LEVEL SECURITY;

-- Club group members
CREATE TABLE public.club_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.club_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

ALTER TABLE public.club_group_members ENABLE ROW LEVEL SECURITY;

-- Helper: is user coach or creator of this club
CREATE OR REPLACE FUNCTION public.is_club_coach_or_creator(_user_id UUID, _club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE conversation_id = _club_id AND user_id = _user_id AND (is_coach = true OR is_admin = true)
  ) OR EXISTS (
    SELECT 1 FROM conversations
    WHERE id = _club_id AND created_by = _user_id
  )
$$;

-- RLS for club_groups
CREATE POLICY "Club members can view groups"
ON public.club_groups FOR SELECT
USING (is_club_member(auth.uid(), club_id));

CREATE POLICY "Coaches can create groups"
ON public.club_groups FOR INSERT
WITH CHECK (is_club_coach_or_creator(auth.uid(), club_id));

CREATE POLICY "Coaches can update groups"
ON public.club_groups FOR UPDATE
USING (is_club_coach_or_creator(auth.uid(), club_id));

CREATE POLICY "Coaches can delete groups"
ON public.club_groups FOR DELETE
USING (is_club_coach_or_creator(auth.uid(), club_id));

-- RLS for club_group_members
CREATE POLICY "Club members can view group members"
ON public.club_group_members FOR SELECT
USING (EXISTS (
  SELECT 1 FROM club_groups cg
  WHERE cg.id = club_group_members.group_id AND is_club_member(auth.uid(), cg.club_id)
));

CREATE POLICY "Coaches can add group members"
ON public.club_group_members FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM club_groups cg
  WHERE cg.id = club_group_members.group_id AND is_club_coach_or_creator(auth.uid(), cg.club_id)
));

CREATE POLICY "Coaches can remove group members"
ON public.club_group_members FOR DELETE
USING (EXISTS (
  SELECT 1 FROM club_groups cg
  WHERE cg.id = club_group_members.group_id AND is_club_coach_or_creator(auth.uid(), cg.club_id)
));

-- Add target_group_id to coaching_sessions for group-based targeting
ALTER TABLE public.coaching_sessions ADD COLUMN IF NOT EXISTS target_group_id UUID REFERENCES public.club_groups(id) ON DELETE SET NULL;
