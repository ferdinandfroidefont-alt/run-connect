-- Corriger les avertissements de sécurité pour les fonctions search_path

-- Mettre à jour la fonction accept_club_invitation
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

-- Mettre à jour la fonction decline_club_invitation
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

-- Mettre à jour la fonction handle_club_invitation
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