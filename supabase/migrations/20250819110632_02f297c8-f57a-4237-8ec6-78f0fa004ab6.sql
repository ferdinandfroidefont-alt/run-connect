-- Modify conversations table to support groups
ALTER TABLE public.conversations 
ADD COLUMN is_group boolean DEFAULT false,
ADD COLUMN group_name text,
ADD COLUMN group_description text,
ADD COLUMN group_avatar_url text,
ADD COLUMN created_by uuid REFERENCES auth.users(id);

-- Create group_members table
CREATE TABLE public.group_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  is_admin boolean DEFAULT false,
  UNIQUE(conversation_id, user_id)
);

-- Enable RLS for group_members
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Create policies for group_members
CREATE POLICY "Users can view group members they belong to"
ON public.group_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM group_members gm2 
    WHERE gm2.conversation_id = group_members.conversation_id 
    AND gm2.user_id = auth.uid()
  )
);

CREATE POLICY "Group admins can manage members"
ON public.group_members
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM group_members gm 
    WHERE gm.conversation_id = group_members.conversation_id 
    AND gm.user_id = auth.uid() 
    AND gm.is_admin = true
  )
);

CREATE POLICY "Users can join groups"
ON public.group_members
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Update conversations policies for groups
DROP POLICY "Friends can create conversations" ON public.conversations;
DROP POLICY "Users can view conversations with friends" ON public.conversations;
DROP POLICY "Users can update conversations with friends" ON public.conversations;

-- New policies for both direct messages and groups
CREATE POLICY "Users can create conversations and groups"
ON public.conversations
FOR INSERT
WITH CHECK (
  (auth.uid() = participant_1 AND is_group = false) OR
  (auth.uid() = created_by AND is_group = true)
);

CREATE POLICY "Users can view their conversations and groups"
ON public.conversations
FOR SELECT
USING (
  (
    -- Direct messages (friend check)
    is_group = false AND 
    ((auth.uid() = participant_1 OR auth.uid() = participant_2) AND are_users_friends(participant_1, participant_2))
  ) OR (
    -- Group messages (member check)
    is_group = true AND 
    EXISTS (
      SELECT 1 FROM group_members gm 
      WHERE gm.conversation_id = conversations.id 
      AND gm.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update their conversations and groups"
ON public.conversations
FOR UPDATE
USING (
  (
    -- Direct messages (friend check)
    is_group = false AND 
    ((auth.uid() = participant_1 OR auth.uid() = participant_2) AND are_users_friends(participant_1, participant_2))
  ) OR (
    -- Group admin check
    is_group = true AND 
    EXISTS (
      SELECT 1 FROM group_members gm 
      WHERE gm.conversation_id = conversations.id 
      AND gm.user_id = auth.uid() 
      AND gm.is_admin = true
    )
  )
);

-- Update messages policies for groups
DROP POLICY "Friends can send messages in their conversations" ON public.messages;
DROP POLICY "Users can view messages with friends" ON public.messages;
DROP POLICY "Users can update message read status with friends" ON public.messages;

-- New message policies
CREATE POLICY "Users can send messages in their conversations and groups"
ON public.messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (
        (
          -- Direct messages
          c.is_group = false AND
          ((c.participant_1 = auth.uid() OR c.participant_2 = auth.uid()) AND are_users_friends(c.participant_1, c.participant_2))
        ) OR (
          -- Group messages
          c.is_group = true AND
          EXISTS (
            SELECT 1 FROM group_members gm 
            WHERE gm.conversation_id = c.id 
            AND gm.user_id = auth.uid()
          )
        )
      )
    )
  )
);

CREATE POLICY "Users can view messages in their conversations and groups"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
    AND (
      (
        -- Direct messages
        c.is_group = false AND
        ((auth.uid() = c.participant_1 OR auth.uid() = c.participant_2) AND are_users_friends(c.participant_1, c.participant_2))
      ) OR (
        -- Group messages
        c.is_group = true AND
        EXISTS (
          SELECT 1 FROM group_members gm 
          WHERE gm.conversation_id = c.id 
          AND gm.user_id = auth.uid()
        )
      )
    )
  )
);

CREATE POLICY "Users can update message read status in their conversations and groups"
ON public.messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
    AND (
      (
        -- Direct messages
        c.is_group = false AND
        ((auth.uid() = c.participant_1 OR auth.uid() = c.participant_2) AND are_users_friends(c.participant_1, c.participant_2))
      ) OR (
        -- Group messages
        c.is_group = true AND
        EXISTS (
          SELECT 1 FROM group_members gm 
          WHERE gm.conversation_id = c.id 
          AND gm.user_id = auth.uid()
        )
      )
    )
  )
);

-- Add session sharing to messages
ALTER TABLE public.messages 
ADD COLUMN session_id uuid REFERENCES sessions(id),
ADD COLUMN message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'session_share'));