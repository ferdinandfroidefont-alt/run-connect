-- Supprimer la politique restrictive qui bloque les organisateurs
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.session_participants;

-- Garder seulement la politique qui permet aux organisateurs d'ajouter des participants
-- La politique "session_participants_insert" existe déjà et est correcte

-- Vérifier qu'on a bien la bonne politique
-- (Cette politique permet aux utilisateurs de s'ajouter eux-mêmes OU aux organisateurs d'ajouter des participants)