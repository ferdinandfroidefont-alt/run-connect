-- Ajouter la colonne preferred_language à la table profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'fr';