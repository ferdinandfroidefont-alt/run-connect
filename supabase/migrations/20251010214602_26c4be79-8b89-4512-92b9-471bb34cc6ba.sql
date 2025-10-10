-- Ajouter un champ pour distinguer FCM (Android) vs APNs (iOS)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token_platform TEXT;

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_profiles_push_token_platform ON profiles(push_token_platform);

COMMENT ON COLUMN profiles.push_token_platform IS 'Platform du token push: android (FCM) ou ios (APNs)';