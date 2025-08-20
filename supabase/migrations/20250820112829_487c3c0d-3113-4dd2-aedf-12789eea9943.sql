-- Remove the existing unique constraint that's preventing multiple group creation
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS unique_conversation;

-- Create a new unique constraint that only applies to non-group conversations
-- This allows multiple groups but prevents duplicate direct conversations
ALTER TABLE conversations 
ADD CONSTRAINT unique_direct_conversation 
UNIQUE (participant_1, participant_2, is_group) 
WHERE is_group = false;

-- Add an index for performance on group queries
CREATE INDEX IF NOT EXISTS idx_conversations_groups ON conversations (is_group, created_by) WHERE is_group = true;