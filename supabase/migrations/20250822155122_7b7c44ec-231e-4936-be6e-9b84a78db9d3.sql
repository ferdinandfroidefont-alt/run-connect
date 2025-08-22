-- Create table to track daily message counts
CREATE TABLE public.daily_message_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  message_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable Row Level Security
ALTER TABLE public.daily_message_limits ENABLE ROW LEVEL SECURITY;

-- Create policies for daily message limits
CREATE POLICY "Users can view their own daily limits" 
ON public.daily_message_limits 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily limits" 
ON public.daily_message_limits 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily limits" 
ON public.daily_message_limits 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Function to increment daily message count
CREATE OR REPLACE FUNCTION public.increment_daily_message_count(user_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- Insert or update the daily message count
  INSERT INTO public.daily_message_limits (user_id, date, message_count)
  VALUES (user_id_param, CURRENT_DATE, 1)
  ON CONFLICT (user_id, date) 
  DO UPDATE SET 
    message_count = daily_message_limits.message_count + 1,
    updated_at = now()
  RETURNING message_count INTO current_count;
  
  RETURN current_count;
END;
$$;

-- Function to get daily message count
CREATE OR REPLACE FUNCTION public.get_daily_message_count(user_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
BEGIN
  SELECT message_count INTO current_count
  FROM public.daily_message_limits
  WHERE user_id = user_id_param AND date = CURRENT_DATE;
  
  RETURN COALESCE(current_count, 0);
END;
$$;

-- Function to check if user can send message
CREATE OR REPLACE FUNCTION public.can_user_send_message(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
  is_premium BOOLEAN;
BEGIN
  -- Check if user is premium
  SELECT subscribed INTO is_premium
  FROM public.subscribers
  WHERE user_id = user_id_param OR email = (
    SELECT email FROM auth.users WHERE id = user_id_param
  );
  
  -- If premium user, always allow
  IF COALESCE(is_premium, false) = true THEN
    RETURN true;
  END IF;
  
  -- Get current daily count
  SELECT get_daily_message_count(user_id_param) INTO current_count;
  
  -- Allow if under limit
  RETURN current_count < 3;
END;
$$;