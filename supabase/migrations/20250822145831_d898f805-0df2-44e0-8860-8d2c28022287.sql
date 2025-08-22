-- Corriger le problème de sécurité pour la fonction generate_club_code
CREATE OR REPLACE FUNCTION generate_club_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Trigger pour générer automatiquement un code lors de la création d'un club
CREATE OR REPLACE FUNCTION trigger_generate_club_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Si c'est un club et qu'il n'y a pas encore de code
    IF NEW.is_group = true AND NEW.club_code IS NULL THEN
        NEW.club_code = generate_club_code();
    END IF;
    RETURN NEW;
END;
$$;

-- Créer le trigger sur INSERT pour les nouvelles conversations de club
DROP TRIGGER IF EXISTS trigger_club_code_on_insert ON conversations;
CREATE TRIGGER trigger_club_code_on_insert
    BEFORE INSERT ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION trigger_generate_club_code();