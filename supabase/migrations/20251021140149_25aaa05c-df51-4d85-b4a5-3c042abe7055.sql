-- Supprimer l'ancienne politique de suppression
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;

-- Ajouter une colonne pour marquer les messages comme supprimés
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Créer une politique pour permettre aux utilisateurs de marquer leurs messages comme supprimés
CREATE POLICY "Users can mark their messages as deleted"
ON messages
FOR UPDATE
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);