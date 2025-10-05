-- Add avatar_model_id column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_model_id TEXT DEFAULT 'male-athlete-01';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_avatar_model_id ON profiles(avatar_model_id);

-- Add comment for documentation
COMMENT ON COLUMN profiles.avatar_model_id IS 'ID of the selected photorealistic 3D avatar model';