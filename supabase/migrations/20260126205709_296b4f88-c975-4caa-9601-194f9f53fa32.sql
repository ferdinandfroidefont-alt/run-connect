-- Ajouter une policy pour permettre aux utilisateurs authentifiés de voir les profils publics
-- Cette policy permet de voir les champs publics des autres utilisateurs (username, display_name, avatar_url, etc.)

CREATE POLICY "Authenticated users can view all public profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Note: Cette policy permet aux utilisateurs connectés de voir les profils des autres
-- C'est nécessaire pour afficher les listes d'abonnés/abonnements et le feed