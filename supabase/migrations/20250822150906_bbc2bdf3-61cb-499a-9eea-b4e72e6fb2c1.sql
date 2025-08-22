-- Créer une table pour les invitations de club en attente
CREATE TABLE public.club_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Empêcher les invitations en double
  UNIQUE(club_id, invited_user_id)
);

-- Activer RLS
ALTER TABLE public.club_invitations ENABLE ROW LEVEL SECURITY;

-- Politiques RLS
CREATE POLICY "Users can view invitations they sent or received"
ON public.club_invitations FOR SELECT
USING (auth.uid() = inviter_id OR auth.uid() = invited_user_id);

CREATE POLICY "Club admins can invite users"
ON public.club_invitations FOR INSERT
WITH CHECK (
  auth.uid() = inviter_id AND
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = club_invitations.club_id 
    AND c.is_group = true 
    AND c.created_by = auth.uid()
  )
);

CREATE POLICY "Invited users can update their invitations"
ON public.club_invitations FOR UPDATE
USING (auth.uid() = invited_user_id);

CREATE POLICY "Inviters can delete their invitations"
ON public.club_invitations FOR DELETE
USING (auth.uid() = inviter_id);

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_club_invitations_updated_at
  BEFORE UPDATE ON public.club_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Fonction pour accepter une invitation
CREATE OR REPLACE FUNCTION public.accept_club_invitation(invitation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  invitation_record RECORD;
BEGIN
  -- Récupérer les détails de l'invitation
  SELECT * INTO invitation_record
  FROM club_invitations
  WHERE id = invitation_id 
    AND invited_user_id = auth.uid()
    AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Marquer l'invitation comme acceptée
  UPDATE club_invitations
  SET status = 'accepted', updated_at = now()
  WHERE id = invitation_id;
  
  -- Ajouter l'utilisateur au club
  INSERT INTO group_members (conversation_id, user_id, is_admin)
  VALUES (invitation_record.club_id, invitation_record.invited_user_id, false)
  ON CONFLICT (conversation_id, user_id) DO NOTHING;
  
  -- Créer une notification pour l'inviteur
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    invitation_record.inviter_id,
    'club_invitation_accepted',
    'Invitation acceptée',
    'Un utilisateur a rejoint votre club',
    jsonb_build_object(
      'club_id', invitation_record.club_id,
      'accepted_by', invitation_record.invited_user_id
    )
  );
  
  RETURN TRUE;
END;
$$;

-- Fonction pour refuser une invitation
CREATE OR REPLACE FUNCTION public.decline_club_invitation(invitation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE club_invitations
  SET status = 'declined', updated_at = now()
  WHERE id = invitation_id 
    AND invited_user_id = auth.uid()
    AND status = 'pending';
  
  RETURN FOUND;
END;
$$;

-- Trigger pour créer une notification lors d'une invitation
CREATE OR REPLACE FUNCTION public.handle_club_invitation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  inviter_profile RECORD;
  club_info RECORD;
BEGIN
  -- Récupérer les infos de l'inviteur
  SELECT username, display_name, avatar_url 
  INTO inviter_profile
  FROM profiles 
  WHERE user_id = NEW.inviter_id;
  
  -- Récupérer les infos du club
  SELECT group_name
  INTO club_info
  FROM conversations
  WHERE id = NEW.club_id;

  -- Créer une notification pour l'utilisateur invité
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    NEW.invited_user_id,
    'club_invitation',
    'Invitation à rejoindre un club',
    COALESCE(inviter_profile.display_name, inviter_profile.username, 'Quelqu''un') || 
    ' vous invite à rejoindre le club "' || COALESCE(club_info.group_name, 'Club') || '"',
    jsonb_build_object(
      'invitation_id', NEW.id,
      'inviter_id', NEW.inviter_id,
      'inviter_name', COALESCE(inviter_profile.display_name, inviter_profile.username),
      'inviter_avatar', inviter_profile.avatar_url,
      'club_id', NEW.club_id,
      'club_name', club_info.group_name
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_club_invitation_created
  AFTER INSERT ON public.club_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_club_invitation();