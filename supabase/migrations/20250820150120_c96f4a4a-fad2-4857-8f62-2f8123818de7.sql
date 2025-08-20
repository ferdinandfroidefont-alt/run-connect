-- Add sports records fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN running_records JSONB DEFAULT '{}',
ADD COLUMN cycling_records JSONB DEFAULT '{}',
ADD COLUMN swimming_records JSONB DEFAULT '{}',
ADD COLUMN triathlon_records JSONB DEFAULT '{}';

-- Add comments to explain the structure
COMMENT ON COLUMN public.profiles.running_records IS 'Running records like {"5k": "20:30", "10k": "42:15", "21k": "1:30:45", "42k": "3:15:30"}';
COMMENT ON COLUMN public.profiles.cycling_records IS 'Cycling records like {"25k": "45:30", "50k": "1:20:15", "100k": "2:45:30"}';
COMMENT ON COLUMN public.profiles.swimming_records IS 'Swimming records like {"100m": "1:15", "500m": "6:30", "1000m": "13:45"}';
COMMENT ON COLUMN public.profiles.triathlon_records IS 'Triathlon records like {"sprint": "1:15:30", "olympic": "2:30:45", "half": "5:15:30", "full": "11:30:45"}';