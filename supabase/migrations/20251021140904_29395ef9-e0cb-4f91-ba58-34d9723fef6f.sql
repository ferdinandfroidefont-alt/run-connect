-- Activer la réplication complète pour la table messages (nécessaire pour realtime)
ALTER TABLE messages REPLICA IDENTITY FULL;

-- Activer la réplication complète pour la table conversations (nécessaire pour realtime)
ALTER TABLE conversations REPLICA IDENTITY FULL;

-- Supprimer les tables de la publication realtime si elles y sont déjà
-- (pour éviter les doublons)
DO $$
BEGIN
  -- Supprimer messages de la publication si elle existe
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE messages;
  END IF;

  -- Supprimer conversations de la publication si elle existe
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE conversations;
  END IF;
END $$;

-- Ajouter les tables à la publication realtime
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;

-- Vérifier que les tables sont bien dans la publication
SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename IN ('messages', 'conversations');