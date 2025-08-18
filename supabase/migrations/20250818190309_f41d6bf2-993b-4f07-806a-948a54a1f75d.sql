-- Corriger les problèmes de sécurité détectés

-- Supprimer la vue problématique qui utilise SECURITY DEFINER
DROP VIEW IF EXISTS public.public_profiles;

-- Corriger la fonction avec un search_path sécurisé
DROP FUNCTION IF EXISTS public.get_public_profile(uuid);

CREATE OR REPLACE FUNCTION public.get_public_profile(profile_user_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.bio,
    p.created_at
  FROM public.profiles p
  WHERE p.user_id = profile_user_id;
$$;

-- Accorder les permissions nécessaires sur la fonction
GRANT EXECUTE ON FUNCTION public.get_public_profile(uuid) TO authenticated;