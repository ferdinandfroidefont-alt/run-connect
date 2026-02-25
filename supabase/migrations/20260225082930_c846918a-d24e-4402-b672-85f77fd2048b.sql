-- Fix the sender_id of the "a rejoint le club" system message for griffonbleu.03
UPDATE public.messages 
SET sender_id = '04d7e554-59b6-4fad-8ba9-f842f31c2100'
WHERE conversation_id = '9bb873a7-4f0f-4dcb-8349-ba94780a196c'
  AND message_type = 'system'
  AND content = 'a rejoint le club'
  AND sender_id = '04d7e554-b6fa-4801-9886-1a0cf689fcb6';