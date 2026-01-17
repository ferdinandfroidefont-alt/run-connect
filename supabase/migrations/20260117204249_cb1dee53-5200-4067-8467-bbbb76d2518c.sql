-- Add new columns to subscribers table for better subscription tracking
ALTER TABLE public.subscribers 
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS trial_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ DEFAULT now();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscribers_stripe_subscription_id ON public.subscribers(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscribers_subscription_status ON public.subscribers(subscription_status);