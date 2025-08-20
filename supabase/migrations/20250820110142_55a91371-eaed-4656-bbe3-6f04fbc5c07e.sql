-- Check current constraint on message_type
SELECT conname, pg_get_constraintdef(c.oid) 
FROM pg_constraint c 
JOIN pg_class t ON c.conrelid = t.oid 
WHERE t.relname = 'messages' AND conname LIKE '%message_type%';

-- Drop the existing constraint if it exists
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_message_type_check;

-- Add a new constraint that allows the message types we need
ALTER TABLE messages ADD CONSTRAINT messages_message_type_check 
CHECK (message_type IN ('text', 'image', 'file', 'session'));