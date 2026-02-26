
-- 1. Add coaching_mode column to conversations
ALTER TABLE conversations 
  ADD COLUMN IF NOT EXISTS coaching_mode text NOT NULL DEFAULT 'shared';

-- 2. Create helper function to get coaching mode
CREATE OR REPLACE FUNCTION public.get_club_coaching_mode(_club_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(coaching_mode, 'shared')
  FROM conversations
  WHERE id = _club_id
$$;

-- 3. Update coaching_sessions UPDATE policy for shared mode
DROP POLICY IF EXISTS "Coaches can update their coaching sessions" ON coaching_sessions;
CREATE POLICY "Coaches can update their coaching sessions" ON coaching_sessions
FOR UPDATE USING (
  auth.uid() = coach_id
  OR (
    get_club_coaching_mode(club_id) = 'shared'
    AND is_club_coach_or_creator(auth.uid(), club_id)
  )
);

-- 4. Update coaching_sessions DELETE policy for shared mode
DROP POLICY IF EXISTS "Coaches can delete their coaching sessions" ON coaching_sessions;
CREATE POLICY "Coaches can delete their coaching sessions" ON coaching_sessions
FOR DELETE USING (
  auth.uid() = coach_id
  OR (
    get_club_coaching_mode(club_id) = 'shared'
    AND is_club_coach_or_creator(auth.uid(), club_id)
  )
);

-- 5. Update coaching_drafts SELECT policy for shared mode
DROP POLICY IF EXISTS "Coaches can view their own drafts" ON coaching_drafts;
CREATE POLICY "Coaches can view drafts" ON coaching_drafts
FOR SELECT USING (
  auth.uid() = coach_id
  OR (
    get_club_coaching_mode(club_id) = 'shared'
    AND is_club_coach_or_creator(auth.uid(), club_id)
  )
);
