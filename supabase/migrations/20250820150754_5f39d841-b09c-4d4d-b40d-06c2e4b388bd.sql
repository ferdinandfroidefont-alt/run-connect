-- Add walking_records field to profiles table  
ALTER TABLE public.profiles 
ADD COLUMN walking_records JSONB DEFAULT '{}';

-- Add comment to explain the structure
COMMENT ON COLUMN public.profiles.walking_records IS 'Walking records like {"5k": "50:30", "10k": "1:45:15", "21k": "3:30:45", "42k": "7:15:30"}';