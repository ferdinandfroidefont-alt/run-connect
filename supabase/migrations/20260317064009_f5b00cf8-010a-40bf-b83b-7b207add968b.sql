ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS favorite_sport text DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country text DEFAULT NULL;