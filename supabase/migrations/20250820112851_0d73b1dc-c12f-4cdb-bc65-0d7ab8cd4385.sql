-- Remove the existing unique constraint that's preventing multiple group creation
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS unique_conversation;

-- Create a unique index that only applies to non-group conversations
-- This allows multiple groups but prevents duplicate direct conversations
CREATE UNIQUE INDEX unique_direct_conversation 
ON conversations (participant_1, participant_2) 
WHERE is_group = false;

-- Add an index for performance on group queries
CREATE INDEX IF NOT EXISTS idx_conversations_groups 
ON conversations (is_group, created_by) 
WHERE is_group = true;