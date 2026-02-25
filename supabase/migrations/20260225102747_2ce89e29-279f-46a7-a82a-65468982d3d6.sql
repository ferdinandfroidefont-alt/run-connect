-- Align existing club creators: set is_coach = true
UPDATE group_members gm
SET is_coach = true
FROM conversations c
WHERE gm.conversation_id = c.id
  AND c.is_group = true
  AND c.created_by = gm.user_id
  AND (gm.is_coach = false OR gm.is_coach IS NULL);