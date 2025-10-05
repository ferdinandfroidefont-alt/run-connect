-- Create table for user wardrobe items
CREATE TABLE IF NOT EXISTS public.user_wardrobe (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  item_type TEXT NOT NULL, -- 'top', 'bottom', 'shoes', 'accessory'
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_equipped BOOLEAN DEFAULT false,
  UNIQUE(user_id, item_id)
);

-- Enable RLS
ALTER TABLE public.user_wardrobe ENABLE ROW LEVEL SECURITY;

-- Users can view their own wardrobe
CREATE POLICY "Users can view their own wardrobe"
ON public.user_wardrobe
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert items to their wardrobe
CREATE POLICY "Users can add items to their wardrobe"
ON public.user_wardrobe
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own wardrobe
CREATE POLICY "Users can update their wardrobe"
ON public.user_wardrobe
FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_user_wardrobe_user_id ON public.user_wardrobe(user_id);
CREATE INDEX idx_user_wardrobe_equipped ON public.user_wardrobe(user_id, is_equipped) WHERE is_equipped = true;