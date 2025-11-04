-- Allow users to view other users' reliability stats
-- This is needed to display reliability badges on public profiles

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view their own stats" ON user_stats;

-- Create new policies: one for own stats, one for viewing others' stats
CREATE POLICY "Users can view their own stats"
  ON user_stats
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view others reliability stats"
  ON user_stats  
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    auth.uid() <> user_id
  );