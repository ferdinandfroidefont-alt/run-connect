-- Ajouter une colonne pour l'image de la séance
ALTER TABLE public.sessions 
ADD COLUMN image_url text;

-- Créer un bucket pour les images de séances
INSERT INTO storage.buckets (id, name, public) VALUES ('session-images', 'session-images', true);

-- Créer les politiques RLS pour le bucket session-images
CREATE POLICY "Users can view session images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'session-images');

CREATE POLICY "Users can upload session images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'session-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own session images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'session-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own session images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'session-images' AND auth.uid()::text = (storage.foldername(name))[1]);