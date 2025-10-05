-- Add column to store Ready Player Me avatar URL
ALTER TABLE profiles 
ADD COLUMN rpm_avatar_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN profiles.rpm_avatar_url IS 'URL of the Ready Player Me GLB model (e.g., https://models.readyplayer.me/...)';

-- Create index for faster queries
CREATE INDEX idx_profiles_rpm_avatar_url ON profiles(rpm_avatar_url) WHERE rpm_avatar_url IS NOT NULL;