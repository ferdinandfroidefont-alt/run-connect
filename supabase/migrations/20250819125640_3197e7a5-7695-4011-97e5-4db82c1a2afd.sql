-- Supprimer complètement toutes les politiques de la table conversations
DROP POLICY IF EXISTS "Users can view their direct conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create direct conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view their conversations and groups" ON public.conversations;
DROP POLICY IF EXISTS "Users can update their conversations and groups" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations and groups" ON public.conversations;

-- Créer des fonctions de sécurité pour éviter la récursion
CREATE OR REPLACE FUNCTION public.user_can_view_conversation(conversation_id uuid)
RETURNS boolean AS $$
DECLARE
  conv_record RECORD;
  is_member boolean := false;
BEGIN
  -- Récupérer les informations de la conversation
  SELECT * INTO conv_record FROM public.conversations WHERE id = conversation_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Si c'est une conversation directe
  IF conv_record.is_group = false THEN
    RETURN (auth.uid() = conv_record.participant_1 OR auth.uid() = conv_record.participant_2);
  END IF;
  
  -- Si c'est un groupe, vérifier l'appartenance
  SELECT EXISTS(
    SELECT 1 FROM public.group_members 
    WHERE conversation_id = conv_record.id AND user_id = auth.uid()
  ) INTO is_member;
  
  RETURN is_member;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path TO 'public';

CREATE OR REPLACE FUNCTION public.user_can_update_conversation(conversation_id uuid)
RETURNS boolean AS $$
DECLARE
  conv_record RECORD;
  is_admin boolean := false;
BEGIN
  -- Récupérer les informations de la conversation
  SELECT * INTO conv_record FROM public.conversations WHERE id = conversation_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Si c'est une conversation directe
  IF conv_record.is_group = false THEN
    RETURN (auth.uid() = conv_record.participant_1 OR auth.uid() = conv_record.participant_2);
  END IF;
  
  -- Si c'est un groupe, vérifier si l'utilisateur est admin
  SELECT EXISTS(
    SELECT 1 FROM public.group_members 
    WHERE conversation_id = conv_record.id AND user_id = auth.uid() AND is_admin = true
  ) INTO is_admin;
  
  RETURN is_admin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path TO 'public';

-- Créer de nouvelles politiques simples utilisant ces fonctions
CREATE POLICY "conversations_select_policy"
  ON public.conversations
  FOR SELECT
  TO authenticated
  USING (public.user_can_view_conversation(id));

CREATE POLICY "conversations_insert_policy"
  ON public.conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (is_group = false AND auth.uid() = participant_1)
    OR 
    (is_group = true AND auth.uid() = created_by)
  );

CREATE POLICY "conversations_update_policy"
  ON public.conversations
  FOR UPDATE
  TO authenticated
  USING (public.user_can_update_conversation(id));