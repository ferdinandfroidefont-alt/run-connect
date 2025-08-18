-- Create a table for user follows/subscriptions
CREATE TABLE public.user_follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL,
  following_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

-- Create policies for user follows
CREATE POLICY "Users can view follows they are involved in" 
ON public.user_follows 
FOR SELECT 
USING ((auth.uid() = follower_id) OR (auth.uid() = following_id));

CREATE POLICY "Users can follow others" 
ON public.user_follows 
FOR INSERT 
WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow others" 
ON public.user_follows 
FOR DELETE 
USING (auth.uid() = follower_id);

-- Add a private field to profiles table if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_private boolean DEFAULT false;