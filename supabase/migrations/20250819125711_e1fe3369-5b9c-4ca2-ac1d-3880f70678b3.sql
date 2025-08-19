-- Désactiver RLS temporairement pour nettoyer complètement
ALTER TABLE public.conversations DISABLE ROW LEVEL SECURITY;

-- Supprimer TOUTES les politiques existantes
DROP POLICY IF EXISTS "conversations_select_policy" ON public.conversations;
DROP POLICY IF EXISTS "conversations_insert_policy" ON public.conversations;
DROP POLICY IF EXISTS "conversations_update_policy" ON public.conversations;
DROP POLICY IF EXISTS "Users can view their direct conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create direct conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update their conversations" ON public.conversations;

-- Supprimer les anciennes fonctions
DROP FUNCTION IF EXISTS public.user_can_view_conversation(uuid);
DROP FUNCTION IF EXISTS public.user_can_update_conversation(uuid);

-- Réactiver RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Créer des politiques simples sans récursion
CREATE POLICY "conversations_select_simple"
  ON public.conversations
  FOR SELECT
  TO authenticated
  USING (
    -- Pour les conversations directes (non-groupes)
    (is_group = false AND (auth.uid() = participant_1 OR auth.uid() = participant_2))
    OR
    -- Pour les groupes, utiliser une sous-requête simple
    (is_group = true AND id IN (
      SELECT gm.conversation_id 
      FROM public.group_members gm 
      WHERE gm.user_id = auth.uid()
    ))
  );

CREATE POLICY "conversations_insert_simple"
  ON public.conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Pour créer une conversation directe, l'utilisateur doit être participant_1
    (is_group = false AND auth.uid() = participant_1)
    OR
    -- Pour créer un groupe, l'utilisateur doit être le créateur
    (is_group = true AND auth.uid() = created_by)
  );

CREATE POLICY "conversations_update_simple"
  ON public.conversations
  FOR UPDATE
  TO authenticated
  USING (
    -- Pour les conversations directes
    (is_group = false AND (auth.uid() = participant_1 OR auth.uid() = participant_2))
    OR
    -- Pour les groupes, seuls les admins peuvent modifier
    (is_group = true AND id IN (
      SELECT gm.conversation_id 
      FROM public.group_members gm 
      WHERE gm.user_id = auth.uid() AND gm.is_admin = true
    ))
  );