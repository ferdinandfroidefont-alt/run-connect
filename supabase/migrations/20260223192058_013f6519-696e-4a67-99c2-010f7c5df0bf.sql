ALTER TABLE messages DROP CONSTRAINT messages_message_type_check;
ALTER TABLE messages ADD CONSTRAINT messages_message_type_check 
  CHECK (message_type = ANY (ARRAY['text'::text, 'image'::text, 'file'::text, 'session'::text, 'voice'::text, 'poll'::text]));