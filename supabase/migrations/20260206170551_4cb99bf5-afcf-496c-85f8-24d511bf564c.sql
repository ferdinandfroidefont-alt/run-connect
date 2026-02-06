
-- Ajouter la colonne reply_to_id à la table messages pour supporter les réponses
ALTER TABLE public.messages ADD COLUMN reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL;

-- Index pour les requêtes de réponses
CREATE INDEX idx_messages_reply_to ON public.messages (reply_to_id) WHERE reply_to_id IS NOT NULL;
