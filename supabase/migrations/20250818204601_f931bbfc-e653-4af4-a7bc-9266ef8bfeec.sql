-- Corriger le problème de search_path pour la fonction handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  username_base TEXT;
  username_final TEXT;
  counter INTEGER := 1;
BEGIN
  -- Générer un nom d'utilisateur de base à partir de l'email ou user ID
  IF NEW.email IS NOT NULL THEN
    username_base := split_part(NEW.email, '@', 1);
  ELSE
    username_base := 'user' || substring(NEW.id::text, 1, 8);
  END IF;
  
  -- Nettoyer le nom d'utilisateur (enlever caractères spéciaux)
  username_base := regexp_replace(username_base, '[^a-zA-Z0-9_]', '', 'g');
  username_final := username_base;
  
  -- S'assurer que le nom d'utilisateur est unique
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = username_final) LOOP
    username_final := username_base || counter::text;
    counter := counter + 1;
  END LOOP;
  
  -- Créer le profil avec l'email et un nom d'utilisateur unique
  INSERT INTO public.profiles (
    user_id,
    username,
    display_name,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    username_final,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email, username_final),
    NOW(),
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;