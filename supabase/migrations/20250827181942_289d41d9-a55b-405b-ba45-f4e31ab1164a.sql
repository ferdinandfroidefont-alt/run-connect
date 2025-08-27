-- Activer l'extension pgcrypto pour gen_random_bytes
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Corriger la fonction pour générer un code de parrainage plus simple
CREATE OR REPLACE FUNCTION public.generate_referral_code()
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
        -- Générer un code de 8 caractères alphanumériques en utilisant random()
        code := upper(
            substring(md5(random()::text) from 1 for 8)
        );
        -- Remplacer les lettres par des chiffres pour avoir uniquement des alphanumériques
        code := translate(code, 'abcdef', '012345');
        
        -- Vérifier si le code existe déjà
        SELECT EXISTS(
            SELECT 1 FROM profiles 
            WHERE referral_code = code
        ) INTO exists_check;
        
        -- Si le code n'existe pas, on peut l'utiliser
        IF NOT exists_check THEN
            RETURN code;
        END IF;
    END LOOP;
END;
$$;

-- Générer des codes de parrainage pour tous les utilisateurs existants qui n'en ont pas
UPDATE public.profiles 
SET referral_code = generate_referral_code()
WHERE referral_code IS NULL;