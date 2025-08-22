-- Créer des politiques RLS pour les avatars de club dans le bucket avatars
-- Les créateurs de club peuvent uploader/modifier les avatars de leur club

-- Politique pour permettre aux créateurs de club d'uploader des avatars de club
CREATE POLICY "Club creators can upload club avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (storage.foldername(name))[2] = 'club'
);

-- Politique pour permettre aux créateurs de club de mettre à jour les avatars de leur club
CREATE POLICY "Club creators can update their club avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (storage.foldername(name))[2] = 'club'
);

-- Politique pour permettre aux créateurs de club de supprimer les avatars de leur club
CREATE POLICY "Club creators can delete their club avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (storage.foldername(name))[2] = 'club'
);

-- Les avatars de club sont visibles par tous (lecture publique déjà couverte par le bucket public)