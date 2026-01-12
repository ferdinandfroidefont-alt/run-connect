-- Ajouter une colonne pour stocker les waypoints (points cliqués par l'utilisateur)
ALTER TABLE public.routes 
ADD COLUMN IF NOT EXISTS waypoints JSONB DEFAULT '[]'::jsonb;