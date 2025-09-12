-- Corriger les fonctions avec search_path manquant pour la sécurité
CREATE OR REPLACE FUNCTION public.is_user_blocked(blocker_user_id uuid, blocked_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM blocked_users 
    WHERE blocker_id = blocker_user_id 
    AND blocked_id = blocked_user_id
  );
$function$;

CREATE OR REPLACE FUNCTION public.block_user(user_to_block_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Remove all follow relationships between users
  DELETE FROM user_follows 
  WHERE (follower_id = auth.uid() AND following_id = user_to_block_id)
     OR (follower_id = user_to_block_id AND following_id = auth.uid());
  
  -- Add to blocked users (ON CONFLICT to avoid duplicates)
  INSERT INTO blocked_users (blocker_id, blocked_id)
  VALUES (auth.uid(), user_to_block_id)
  ON CONFLICT (blocker_id, blocked_id) DO NOTHING;
  
  RETURN TRUE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_club_code()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;