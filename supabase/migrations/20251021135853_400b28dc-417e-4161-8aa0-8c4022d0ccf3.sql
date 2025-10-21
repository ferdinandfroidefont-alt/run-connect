-- Ajouter une politique RLS pour permettre aux utilisateurs de supprimer leurs propres messages
CREATE POLICY "Users can delete their own messages"
ON messages
FOR DELETE
USING (auth.uid() = sender_id);