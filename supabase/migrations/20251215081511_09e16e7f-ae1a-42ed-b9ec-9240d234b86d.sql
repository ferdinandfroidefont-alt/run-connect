
-- ============================================
-- PHASE 2 FINALE: Sécuriser toutes les fonctions restantes
-- ============================================

-- handle_new_message_notification
CREATE OR REPLACE FUNCTION public.handle_new_message_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_profile RECORD;
  recipient_id UUID;
  conversation_info RECORD;
BEGIN
  SELECT * INTO conversation_info
  FROM conversations 
  WHERE id = NEW.conversation_id;
  
  IF conversation_info.is_group = true THEN
    RETURN NEW;
  END IF;
  
  IF conversation_info.participant_1 = NEW.sender_id THEN
    recipient_id := conversation_info.participant_2;
  ELSE
    recipient_id := conversation_info.participant_1;
  END IF;
  
  IF NOT are_users_friends(NEW.sender_id, recipient_id) THEN
    RETURN NEW;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = recipient_id 
    AND notif_message = true
  ) THEN
    RETURN NEW;
  END IF;
  
  SELECT username, display_name, avatar_url 
  INTO sender_profile
  FROM profiles 
  WHERE user_id = NEW.sender_id;

  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    recipient_id,
    'message',
    'Nouveau message',
    COALESCE(sender_profile.display_name, sender_profile.username, 'Quelqu''un') || ' vous a envoyé un message',
    jsonb_build_object(
      'sender_id', NEW.sender_id,
      'sender_name', COALESCE(sender_profile.display_name, sender_profile.username),
      'sender_avatar', sender_profile.avatar_url,
      'conversation_id', NEW.conversation_id,
      'message_id', NEW.id,
      'message_preview', LEFT(NEW.content, 100)
    )
  );

  RETURN NEW;
END;
$$;

-- handle_friend_session_notification
CREATE OR REPLACE FUNCTION public.handle_friend_session_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  organizer_profile RECORD;
  friend_record RECORD;
BEGIN
  SELECT username, display_name, avatar_url 
  INTO organizer_profile
  FROM profiles 
  WHERE user_id = NEW.organizer_id;
  
  FOR friend_record IN (
    SELECT DISTINCT 
      CASE 
        WHEN uf1.follower_id = NEW.organizer_id THEN uf1.following_id
        ELSE uf1.follower_id
      END as friend_id
    FROM user_follows uf1
    JOIN user_follows uf2 ON (
      (uf1.follower_id = NEW.organizer_id AND uf1.following_id = uf2.follower_id AND uf2.following_id = NEW.organizer_id) OR
      (uf1.following_id = NEW.organizer_id AND uf1.follower_id = uf2.following_id AND uf2.follower_id = NEW.organizer_id)
    )
    WHERE uf1.status = 'accepted' 
    AND uf2.status = 'accepted'
    AND (
      (uf1.follower_id = NEW.organizer_id AND uf1.following_id != NEW.organizer_id) OR
      (uf1.following_id = NEW.organizer_id AND uf1.follower_id != NEW.organizer_id)
    )
  ) LOOP
    
    IF EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = friend_record.friend_id 
      AND p.is_premium = true
      AND p.notif_friend_session = true
    ) THEN
      
      INSERT INTO notifications (user_id, type, title, message, data)
      VALUES (
        friend_record.friend_id,
        'friend_session',
        'Session d''ami créée',
        COALESCE(organizer_profile.display_name, organizer_profile.username, 'Un ami') || 
        ' a créé une session: ' || NEW.title,
        jsonb_build_object(
          'session_id', NEW.id,
          'organizer_id', NEW.organizer_id,
          'organizer_name', COALESCE(organizer_profile.display_name, organizer_profile.username),
          'organizer_avatar', organizer_profile.avatar_url,
          'session_title', NEW.title,
          'session_type', NEW.activity_type,
          'scheduled_at', NEW.scheduled_at,
          'location_name', NEW.location_name
        )
      );
      
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- audit_profiles_changes
CREATE OR REPLACE FUNCTION public.audit_profiles_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (
    OLD.phone IS DISTINCT FROM NEW.phone OR
    OLD.strava_access_token IS DISTINCT FROM NEW.strava_access_token OR
    OLD.instagram_access_token IS DISTINCT FROM NEW.instagram_access_token
  ) THEN
    INSERT INTO audit_log (user_id, table_name, action, details)
    VALUES (
      NEW.user_id,
      'profiles',
      'SENSITIVE_UPDATE',
      jsonb_build_object(
        'fields_changed', ARRAY[
          CASE WHEN OLD.phone IS DISTINCT FROM NEW.phone THEN 'phone' END,
          CASE WHEN OLD.strava_access_token IS DISTINCT FROM NEW.strava_access_token THEN 'strava_token' END,
          CASE WHEN OLD.instagram_access_token IS DISTINCT FROM NEW.instagram_access_token THEN 'instagram_token' END
        ]::TEXT[],
        'changed_by', auth.uid()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  username_base TEXT;
  username_final TEXT;
  counter INTEGER := 1;
  new_referral_code TEXT;
BEGIN
  IF NEW.email IS NOT NULL THEN
    username_base := split_part(NEW.email, '@', 1);
  ELSE
    username_base := 'user' || substring(NEW.id::text, 1, 8);
  END IF;
  
  username_base := regexp_replace(username_base, '[^a-zA-Z0-9_]', '', 'g');
  username_final := username_base;
  
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = username_final) LOOP
    username_final := username_base || counter::text;
    counter := counter + 1;
  END LOOP;
  
  new_referral_code := generate_referral_code();
  
  INSERT INTO public.profiles (
    user_id,
    username,
    display_name,
    referral_code,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    username_final,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email, username_final),
    new_referral_code,
    NOW(),
    NOW()
  );
  
  RETURN NEW;
END;
$$;

-- handle_session_acceptance_notification
CREATE OR REPLACE FUNCTION public.handle_session_acceptance_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  organizer_profile RECORD;
  participant_profile RECORD;
  session_info RECORD;
BEGIN
  SELECT title, organizer_id, activity_type, location_name, scheduled_at
  INTO session_info
  FROM sessions 
  WHERE id = NEW.session_id;
  
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  
  SELECT username, display_name, avatar_url 
  INTO organizer_profile
  FROM profiles 
  WHERE user_id = session_info.organizer_id;
  
  SELECT username, display_name, avatar_url 
  INTO participant_profile
  FROM profiles 
  WHERE user_id = NEW.user_id;
  
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = session_info.organizer_id 
    AND notif_session_request = true
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    session_info.organizer_id,
    'session_accepted',
    'Session acceptée',
    COALESCE(participant_profile.display_name, participant_profile.username, 'Quelqu''un') || 
    ' a rejoint votre session: ' || session_info.title,
    jsonb_build_object(
      'session_id', NEW.session_id,
      'participant_id', NEW.user_id,
      'participant_name', COALESCE(participant_profile.display_name, participant_profile.username),
      'participant_avatar', participant_profile.avatar_url,
      'session_title', session_info.title,
      'session_type', session_info.activity_type,
      'scheduled_at', session_info.scheduled_at,
      'location_name', session_info.location_name
    )
  );

  RETURN NEW;
END;
$$;

-- handle_club_invitation
CREATE OR REPLACE FUNCTION public.handle_club_invitation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inviter_profile RECORD;
  club_info RECORD;
BEGIN
  SELECT username, display_name, avatar_url 
  INTO inviter_profile
  FROM profiles 
  WHERE user_id = NEW.inviter_id;
  
  SELECT group_name
  INTO club_info
  FROM conversations
  WHERE id = NEW.club_id;

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

-- handle_follow_request_notification
CREATE OR REPLACE FUNCTION public.handle_follow_request_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  follower_profile RECORD;
BEGIN
  SELECT username, display_name, avatar_url 
  INTO follower_profile
  FROM public.profiles 
  WHERE user_id = NEW.follower_id;
  
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    NEW.following_id,
    'follow_request',
    'Nouvelle demande de suivi',
    COALESCE(follower_profile.display_name, follower_profile.username, 'Quelqu''un') || ' souhaite vous suivre',
    jsonb_build_object(
      'follow_id', NEW.id,
      'follower_id', NEW.follower_id,
      'follower_name', COALESCE(follower_profile.display_name, follower_profile.username),
      'follower_avatar', follower_profile.avatar_url
    )
  );
  
  RETURN NEW;
END;
$$;

-- handle_session_request_notification
CREATE OR REPLACE FUNCTION public.handle_session_request_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requester_profile RECORD;
  session_info RECORD;
BEGIN
  SELECT username, display_name, avatar_url 
  INTO requester_profile
  FROM public.profiles 
  WHERE user_id = NEW.user_id;
  
  SELECT title, organizer_id, activity_type, location_name, scheduled_at
  INTO session_info
  FROM public.sessions 
  WHERE id = NEW.session_id;
  
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = session_info.organizer_id 
    AND notif_session_request = true
  ) THEN
    RETURN NEW;
  END IF;
  
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    session_info.organizer_id,
    'session_request',
    'Demande de participation',
    COALESCE(requester_profile.display_name, requester_profile.username, 'Quelqu''un') || 
    ' demande à rejoindre votre session: ' || session_info.title,
    jsonb_build_object(
      'session_id', NEW.session_id,
      'requester_id', NEW.user_id,
      'requester_name', COALESCE(requester_profile.display_name, requester_profile.username),
      'requester_avatar', requester_profile.avatar_url,
      'session_title', session_info.title,
      'session_type', session_info.activity_type,
      'scheduled_at', session_info.scheduled_at,
      'location_name', session_info.location_name
    )
  );
  
  RETURN NEW;
END;
$$;

-- prevent_user_id_change
CREATE OR REPLACE FUNCTION public.prevent_user_id_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.user_id != NEW.user_id THEN
    RAISE EXCEPTION 'user_id cannot be modified for security reasons';
  END IF;
  RETURN NEW;
END;
$$;
