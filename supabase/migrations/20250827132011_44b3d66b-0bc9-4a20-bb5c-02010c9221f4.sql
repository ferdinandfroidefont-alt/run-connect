-- Ajouter un champ is_admin à la table profiles
ALTER TABLE public.profiles 
ADD COLUMN is_admin boolean DEFAULT false;

-- Définir votre profil comme administrateur (remplacez par votre user_id réel)
-- Vous devrez ajuster cette ligne avec votre vrai user_id
UPDATE public.profiles 
SET is_admin = true 
WHERE username = 'ferdinand_stat_triathlon';

-- Créer un index pour les requêtes d'admin
CREATE INDEX idx_profiles_is_admin ON public.profiles(is_admin) WHERE is_admin = true;