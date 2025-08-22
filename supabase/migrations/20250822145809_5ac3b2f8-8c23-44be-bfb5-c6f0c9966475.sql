-- Ajouter une colonne club_code pour les codes de club privés
ALTER TABLE conversations 
ADD COLUMN club_code TEXT;

-- Créer un index unique pour les codes de club (pour recherche rapide)
CREATE UNIQUE INDEX idx_conversations_club_code 
ON conversations(club_code) 
WHERE club_code IS NOT NULL;

-- Fonction pour générer des codes de club uniques
CREATE OR REPLACE FUNCTION generate_club_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    code TEXT;
    exists_check BOOLEAN;
BEGIN
    LOOP
        -- Générer un code de 8 caractères alphanumériques en majuscules
        code := upper(substring(encode(gen_random_bytes(6), 'base64') from 1 for 8));
        -- Remplacer les caractères non-alphanumériques
        code := regexp_replace(code, '[^A-Z0-9]', '0', 'g');
        
        -- Vérifier si le code existe déjà
        SELECT EXISTS(
            SELECT 1 FROM conversations 
            WHERE club_code = code
        ) INTO exists_check;
        
        -- Si le code n'existe pas, on peut l'utiliser
        IF NOT exists_check THEN
            RETURN code;
        END IF;
    END LOOP;
END;
$$;

-- Générer des codes pour les clubs existants
UPDATE conversations 
SET club_code = generate_club_code()
WHERE is_group = true AND club_code IS NULL;