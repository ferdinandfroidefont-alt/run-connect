-- Corriger la contrainte de statut des session_requests
-- Le problème est que la contrainte attend 'approved' mais le code utilise 'accepted'

-- Supprimer l'ancienne contrainte
ALTER TABLE session_requests DROP CONSTRAINT session_requests_status_check;

-- Créer la nouvelle contrainte avec les bons statuts
ALTER TABLE session_requests ADD CONSTRAINT session_requests_status_check 
CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text]));

-- Mettre à jour les données existantes si nécessaire
UPDATE session_requests SET status = 'accepted' WHERE status = 'approved';