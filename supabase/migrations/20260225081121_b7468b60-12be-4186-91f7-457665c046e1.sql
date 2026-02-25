-- Fix 1: Repair Ferdi club - insert creator as admin in group_members
INSERT INTO public.group_members (conversation_id, user_id, is_admin)
VALUES ('9bb873a7-4f0f-4dcb-8349-ba94780a196c', '0f464761-f1ce-4fc4-bece-253beef13119', true)
ON CONFLICT DO NOTHING;