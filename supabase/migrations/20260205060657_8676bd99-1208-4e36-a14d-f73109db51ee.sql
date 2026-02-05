-- Create table for message reactions
CREATE TABLE public.message_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Enable RLS
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Users can view reactions in their conversations
CREATE POLICY "Users can view reactions in their conversations"
ON public.message_reactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.conversations c ON m.conversation_id = c.id
    LEFT JOIN public.group_members gm ON c.id = gm.conversation_id AND gm.user_id = auth.uid()
    WHERE m.id = message_reactions.message_id
    AND (
      c.participant_1 = auth.uid() 
      OR c.participant_2 = auth.uid()
      OR gm.user_id IS NOT NULL
    )
  )
);

-- Users can add their own reactions
CREATE POLICY "Users can add their own reactions"
ON public.message_reactions FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.conversations c ON m.conversation_id = c.id
    LEFT JOIN public.group_members gm ON c.id = gm.conversation_id AND gm.user_id = auth.uid()
    WHERE m.id = message_reactions.message_id
    AND (
      c.participant_1 = auth.uid() 
      OR c.participant_2 = auth.uid()
      OR gm.user_id IS NOT NULL
    )
  )
);

-- Users can remove their own reactions
CREATE POLICY "Users can remove their own reactions"
ON public.message_reactions FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_message_reactions_message_id ON public.message_reactions(message_id);
CREATE INDEX idx_message_reactions_user_id ON public.message_reactions(user_id);