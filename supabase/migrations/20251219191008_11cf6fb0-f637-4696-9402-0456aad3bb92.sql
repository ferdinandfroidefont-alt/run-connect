-- ========================================
-- FIX REMAINING SQL FUNCTIONS - SET search_path
-- ========================================

-- 1. reward_session_creation
CREATE OR REPLACE FUNCTION public.reward_session_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  PERFORM add_user_points(NEW.organizer_id, 10);
  RETURN NEW;
END;
$function$;

-- 2. reward_session_participation
CREATE OR REPLACE FUNCTION public.reward_session_participation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  session_organizer_id uuid;
BEGIN
  SELECT organizer_id INTO session_organizer_id
  FROM sessions 
  WHERE id = NEW.session_id;
  
  PERFORM add_user_points(NEW.user_id, 30);
  
  IF session_organizer_id IS NOT NULL THEN
    PERFORM add_user_points(session_organizer_id, 50);
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 3. remove_session_points
CREATE OR REPLACE FUNCTION public.remove_session_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  participant_record RECORD;
  participant_count integer;
BEGIN
  SELECT COUNT(*) INTO participant_count
  FROM session_participants 
  WHERE session_id = OLD.id;
  
  PERFORM remove_user_points(OLD.organizer_id, 10);
  
  FOR participant_record IN 
    SELECT user_id FROM session_participants WHERE session_id = OLD.id
  LOOP
    PERFORM remove_user_points(participant_record.user_id, 30);
    PERFORM remove_user_points(OLD.organizer_id, 50);
  END LOOP;
  
  RETURN OLD;
END;
$function$;

-- 4. remove_participation_points
CREATE OR REPLACE FUNCTION public.remove_participation_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  session_organizer_id uuid;
BEGIN
  SELECT organizer_id INTO session_organizer_id
  FROM sessions 
  WHERE id = OLD.session_id;
  
  PERFORM remove_user_points(OLD.user_id, 30);
  
  IF session_organizer_id IS NOT NULL THEN
    PERFORM remove_user_points(session_organizer_id, 50);
  END IF;
  
  RETURN OLD;
END;
$function$;

-- 5. trigger_follow_request_notification
CREATE OR REPLACE FUNCTION public.trigger_follow_request_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  follower_profile RECORD;
BEGIN
  SELECT username, display_name, avatar_url 
  INTO follower_profile
  FROM profiles 
  WHERE user_id = NEW.follower_id;

  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    data
  ) VALUES (
    NEW.following_id,
    'follow_request',
    'Nouvelle demande de suivi',
    COALESCE(follower_profile.display_name, follower_profile.username, 'Quelqu''un') || ' souhaite vous suivre',
    json_build_object(
      'follow_id', NEW.id,
      'follower_id', NEW.follower_id,
      'follower_name', COALESCE(follower_profile.display_name, follower_profile.username),
      'follower_avatar', follower_profile.avatar_url
    )
  );

  RETURN NEW;
END;
$function$;

-- 6. handle_new_message_notification
CREATE OR REPLACE FUNCTION public.handle_new_message_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- 7. handle_friend_session_notification
CREATE OR REPLACE FUNCTION public.handle_friend_session_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- 8. handle_session_acceptance_notification
CREATE OR REPLACE FUNCTION public.handle_session_acceptance_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- 9. handle_club_invitation (create or update if exists)
CREATE OR REPLACE FUNCTION public.handle_club_invitation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
      'club_name', COALESCE(club_info.group_name, 'Club')
    )
  );

  RETURN NEW;
END;
$function$;

-- 10. audit_profiles_changes
CREATE OR REPLACE FUNCTION public.audit_profiles_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- 11. audit_subscribers_changes
CREATE OR REPLACE FUNCTION public.audit_subscribers_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO audit_log (user_id, table_name, action, details)
  VALUES (
    COALESCE(NEW.user_id, OLD.user_id),
    'subscribers',
    TG_OP,
    jsonb_build_object(
      'old_data', CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
      'new_data', CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) ELSE NULL END,
      'changed_by', auth.uid()
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 12. handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- 13. trigger_generate_club_code
CREATE OR REPLACE FUNCTION public.trigger_generate_club_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    IF NEW.is_group = true AND NEW.club_code IS NULL THEN
        NEW.club_code = generate_club_code();
    END IF;
    RETURN NEW;
END;
$function$;

-- 14. update_push_token_timestamp
CREATE OR REPLACE FUNCTION public.update_push_token_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.push_token IS DISTINCT FROM OLD.push_token AND NEW.push_token IS NOT NULL THEN
    NEW.push_token_updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$function$;

-- 15. accept_follow_request (already has it, but ensure)
CREATE OR REPLACE FUNCTION public.accept_follow_request(follow_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  follow_record RECORD;
BEGIN
  SELECT * INTO follow_record FROM user_follows WHERE id = follow_id;
  
  IF NOT FOUND OR follow_record.following_id != auth.uid() THEN
    RETURN FALSE;
  END IF;
  
  UPDATE user_follows SET status = 'accepted' WHERE id = follow_id;
  
  IF NOT EXISTS (
    SELECT 1 FROM user_follows 
    WHERE follower_id = follow_record.following_id 
    AND following_id = follow_record.follower_id
  ) THEN
    INSERT INTO user_follows (follower_id, following_id, status)
    VALUES (follow_record.following_id, follow_record.follower_id, 'accepted');
  ELSE
    UPDATE user_follows 
    SET status = 'accepted' 
    WHERE follower_id = follow_record.following_id 
    AND following_id = follow_record.follower_id;
  END IF;
  
  RETURN TRUE;
END;
$function$;

-- 16. get_user_rank (immutable SQL function)
CREATE OR REPLACE FUNCTION public.get_user_rank(points integer)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT CASE 
    WHEN points >= 5000 THEN 'diamant'
    WHEN points >= 3000 THEN 'platine'
    WHEN points >= 2000 THEN 'or'
    WHEN points >= 1000 THEN 'argent'
    WHEN points >= 500 THEN 'bronze'
    ELSE 'novice'
  END;
$function$;

-- 17. get_friend_suggestions
CREATE OR REPLACE FUNCTION public.get_friend_suggestions(current_user_id uuid, suggestion_limit integer DEFAULT 10)
RETURNS TABLE(user_id uuid, username text, display_name text, avatar_url text, mutual_friends_count bigint, mutual_friend_names text[], source text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    0::bigint as mutual_friends_count,
    ARRAY[]::text[] as mutual_friend_names,
    'suggested'::text as source
  FROM profiles p
  WHERE p.user_id != current_user_id
    AND p.is_private = false
    AND NOT EXISTS (
      SELECT 1 FROM user_follows uf 
      WHERE uf.follower_id = current_user_id AND uf.following_id = p.user_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM dismissed_suggestions ds 
      WHERE ds.user_id = current_user_id AND ds.dismissed_user_id = p.user_id
    )
    AND (p.allow_friend_suggestions = true OR p.allow_friend_suggestions IS NULL)
  ORDER BY p.last_seen DESC NULLS LAST
  LIMIT suggestion_limit;
END;
$function$;