-- Add 'system' and 'coaching_session' to the allowed message_type values
ALTER TABLE public.messages DROP CONSTRAINT messages_message_type_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_message_type_check 
  CHECK (message_type = ANY (ARRAY['text', 'image', 'file', 'session', 'voice', 'poll', 'coaching_session', 'system']));

-- Insert retroactive system messages for the Ferdi club
INSERT INTO public.messages (conversation_id, sender_id, content, message_type)
VALUES (
  '9bb873a7-4f0f-4dcb-8349-ba94780a196c',
  '0f464761-f1ce-4fc4-bece-253beef13119',
  'a créé le club',
  'system'
);

INSERT INTO public.messages (conversation_id, sender_id, content, message_type, created_at)
VALUES (
  '9bb873a7-4f0f-4dcb-8349-ba94780a196c',
  '0f464761-f1ce-4fc4-bece-253beef13119',
  'a ajouté griffonbleu.03',
  'system',
  now() + interval '1 second'
);

INSERT INTO public.messages (conversation_id, sender_id, content, message_type, created_at)
VALUES (
  '9bb873a7-4f0f-4dcb-8349-ba94780a196c',
  '04d7e554-b6fa-4801-9886-1a0cf689fcb6',
  'a rejoint le club',
  'system',
  now() + interval '2 seconds'
);