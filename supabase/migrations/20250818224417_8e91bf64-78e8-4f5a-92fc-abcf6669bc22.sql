-- Function to check if two users are mutual friends (follow each other)
CREATE OR REPLACE FUNCTION public.are_users_friends(user1_id uuid, user2_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Check if user1 follows user2 (accepted)
    SELECT 1 FROM user_follows 
    WHERE follower_id = user1_id 
      AND following_id = user2_id 
      AND status = 'accepted'
  ) AND EXISTS (
    -- Check if user2 follows user1 (accepted)  
    SELECT 1 FROM user_follows 
    WHERE follower_id = user2_id 
      AND following_id = user1_id 
      AND status = 'accepted'
  );
$$;

-- Update conversations policies to only allow friends
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update their conversations" ON conversations;

CREATE POLICY "Friends can create conversations" 
ON conversations FOR INSERT 
WITH CHECK (
  auth.uid() = participant_1 AND 
  are_users_friends(participant_1, participant_2)
);

CREATE POLICY "Users can view conversations with friends" 
ON conversations FOR SELECT 
USING (
  (auth.uid() = participant_1 OR auth.uid() = participant_2) AND
  are_users_friends(participant_1, participant_2)
);

CREATE POLICY "Users can update conversations with friends" 
ON conversations FOR UPDATE 
USING (
  (auth.uid() = participant_1 OR auth.uid() = participant_2) AND
  are_users_friends(participant_1, participant_2)
);

-- Update messages policies to only allow friends
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can update message read status" ON messages;

CREATE POLICY "Friends can send messages in their conversations" 
ON messages FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id AND 
  EXISTS (
    SELECT 1 FROM conversations 
    WHERE id = messages.conversation_id 
      AND ((participant_1 = auth.uid() AND are_users_friends(participant_1, participant_2)) OR
           (participant_2 = auth.uid() AND are_users_friends(participant_1, participant_2)))
  )
);

CREATE POLICY "Users can view messages with friends" 
ON messages FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM conversations 
    WHERE id = messages.conversation_id 
      AND ((auth.uid() = participant_1 OR auth.uid() = participant_2) AND
           are_users_friends(participant_1, participant_2))
  )
);

CREATE POLICY "Users can update message read status with friends" 
ON messages FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM conversations 
    WHERE id = messages.conversation_id 
      AND ((auth.uid() = participant_1 OR auth.uid() = participant_2) AND
           are_users_friends(participant_1, participant_2))
  )
);