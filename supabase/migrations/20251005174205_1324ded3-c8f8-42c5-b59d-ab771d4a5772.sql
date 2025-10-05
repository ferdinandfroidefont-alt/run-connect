-- Normaliser tous les numéros de téléphone existants
UPDATE profiles 
SET phone = CASE 
  -- Enlever les espaces, tirets, parenthèses
  WHEN phone ~ '[\s\-\(\)]' THEN REGEXP_REPLACE(phone, '[\s\-\(\)]', '', 'g')
  ELSE phone
END
WHERE phone IS NOT NULL;

-- Ajouter le 0 initial pour les numéros français à 9 chiffres
UPDATE profiles 
SET phone = '0' || phone
WHERE phone IS NOT NULL 
  AND LENGTH(phone) = 9 
  AND phone ~ '^[1-9][0-9]{8}$';

-- Créer un index pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone) WHERE phone IS NOT NULL;