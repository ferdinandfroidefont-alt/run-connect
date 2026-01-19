-- Add unique constraint to prevent duplicate follow entries
ALTER TABLE user_follows 
ADD CONSTRAINT user_follows_unique_pair 
UNIQUE (follower_id, following_id);

-- Add RLS policy for UPDATE operations on user_follows
CREATE POLICY "Users can update follows they are involved in"
ON user_follows FOR UPDATE
USING (auth.uid() = follower_id OR auth.uid() = following_id);

-- Clean up any invalid 'unfollowed' status entries (should be deleted, not updated)
DELETE FROM user_follows WHERE status = 'unfollowed';