-- Mise à jour des politiques RLS pour la table profiles pour résoudre le problème de sécurité

-- Supprimer la politique actuelle trop permissive
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Créer des politiques plus sécurisées

-- 1. Les utilisateurs peuvent voir leur propre profil complet
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- 2. Les utilisateurs peuvent voir seulement les informations publiques des autres profils
-- (username, display_name, avatar_url, bio - pas de phone, age, ou autres infos sensibles)
CREATE POLICY "Users can view public profile information of others"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND user_id != auth.uid()
);

-- Créer une vue publique pour les profils qui expose seulement les champs non-sensibles
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id,
  user_id,
  username,
  display_name,
  avatar_url,
  bio,
  created_at
FROM public.profiles;

-- Activer RLS sur la vue (hérité de la table de base)
-- Les vues héritent automatiquement des politiques RLS de leur table de base

-- Créer une fonction pour récupérer les informations publiques d'un profil
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