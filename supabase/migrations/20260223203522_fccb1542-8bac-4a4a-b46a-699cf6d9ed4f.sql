
-- Add send_mode and target_athletes to coaching_sessions
ALTER TABLE public.coaching_sessions
ADD COLUMN IF NOT EXISTS send_mode text DEFAULT 'club',
ADD COLUMN IF NOT EXISTS target_athletes uuid[] DEFAULT '{}';

-- Add suggested_date, custom_pace, custom_notes to coaching_participations
ALTER TABLE public.coaching_participations
ADD COLUMN IF NOT EXISTS suggested_date timestamptz,
ADD COLUMN IF NOT EXISTS custom_pace text,
ADD COLUMN IF NOT EXISTS custom_notes text;

-- Update default status to 'sent' for new participations
ALTER TABLE public.coaching_participations ALTER COLUMN status SET DEFAULT 'sent';
