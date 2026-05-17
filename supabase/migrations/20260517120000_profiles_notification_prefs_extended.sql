-- Préférences de notifications étendues (maquette Réglages → Notifications)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notif_comment boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_mention boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_like boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_story_view boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_friend_first_post boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_session_edited boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_session_cancelled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_reminder_d1 boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_reminder_h1 boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_bad_weather boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_recurring_approaching boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_coach_sends boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_athlete_validates boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_coach_review boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_new_plan boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_missed_session boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_athlete_absent boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_club_announcement boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_club_new_session boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_club_new_member boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_weekly_goal boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_streak boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_weekly_report boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_anniversary boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_views_peak boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_personal_record boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_premium_expiring boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_strava_to_associate boolean DEFAULT true;

COMMENT ON COLUMN public.profiles.notif_comment IS 'Push/in-app: commentaires sur séances ou stories';
COMMENT ON COLUMN public.profiles.notif_boost_nearby IS 'Push: séance compatible publiée à proximité (boost)';

-- Vérifie si l'utilisateur accepte ce type (NULL profil ou colonne absente = autorisé)
CREATE OR REPLACE FUNCTION public.profile_allows_notification_type(p_user_id uuid, p_type text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allowed boolean;
BEGIN
  IF p_user_id IS NULL OR p_type IS NULL OR btrim(p_type) = '' THEN
    RETURN true;
  END IF;

  SELECT CASE p_type
    WHEN 'message' THEN COALESCE(notif_message, true)
    WHEN 'follow_request' THEN COALESCE(notif_follow_request, true)
    WHEN 'follow_accepted' THEN COALESCE(notif_follow_request, true)
    WHEN 'follow_back' THEN COALESCE(notif_follow_request, true)
    WHEN 'comment' THEN COALESCE(notif_comment, true)
    WHEN 'mention' THEN COALESCE(notif_mention, true)
    WHEN 'like' THEN COALESCE(notif_like, true)
    WHEN 'story_view' THEN COALESCE(notif_story_view, true)
    WHEN 'friend_first_post' THEN COALESCE(notif_friend_first_post, true)
    WHEN 'session_request' THEN COALESCE(notif_session_request, true)
    WHEN 'friend_session' THEN COALESCE(notif_friend_session, true)
    WHEN 'session_accepted' THEN COALESCE(notif_session_accepted, true)
    WHEN 'presence_confirmed' THEN COALESCE(notif_presence_confirmed, true)
    WHEN 'session_edited' THEN COALESCE(notif_session_edited, true)
    WHEN 'session_cancelled' THEN COALESCE(notif_session_cancelled, true)
    WHEN 'reminder_d1' THEN COALESCE(notif_reminder_d1, true)
    WHEN 'reminder_h1' THEN COALESCE(notif_reminder_h1, true)
    WHEN 'bad_weather' THEN COALESCE(notif_bad_weather, true)
    WHEN 'boost_nearby' THEN COALESCE(notif_boost_nearby, true)
    WHEN 'nearby_session' THEN COALESCE(notif_boost_nearby, true)
    WHEN 'recurring_approaching' THEN COALESCE(notif_recurring_approaching, true)
    WHEN 'coaching_session' THEN COALESCE(notif_coach_sends, true)
    WHEN 'coach_sends' THEN COALESCE(notif_coach_sends, true)
    WHEN 'coaching_plan' THEN COALESCE(notif_new_plan, true)
    WHEN 'new_plan' THEN COALESCE(notif_new_plan, true)
    WHEN 'coaching_completed' THEN COALESCE(notif_athlete_validates, true)
    WHEN 'athlete_validates' THEN COALESCE(notif_athlete_validates, true)
    WHEN 'coaching_scheduled' THEN COALESCE(notif_athlete_validates, true)
    WHEN 'coaching_feedback' THEN COALESCE(notif_coach_review, true)
    WHEN 'coach_review' THEN COALESCE(notif_coach_review, true)
    WHEN 'coaching_reminder' THEN COALESCE(notif_missed_session, true)
    WHEN 'missed_session' THEN COALESCE(notif_missed_session, true)
    WHEN 'athlete_absent' THEN COALESCE(notif_athlete_absent, true)
    WHEN 'club_invitation' THEN COALESCE(notif_club_invitation, true)
    WHEN 'club_announcement' THEN COALESCE(notif_club_announcement, true)
    WHEN 'club_new_session' THEN COALESCE(notif_club_new_session, true)
    WHEN 'club_new_member' THEN COALESCE(notif_club_new_member, true)
    WHEN 'weekly_goal' THEN COALESCE(notif_weekly_goal, true)
    WHEN 'challenge_reminder' THEN COALESCE(notif_weekly_goal, true)
    WHEN 'streak' THEN COALESCE(notif_streak, true)
    WHEN 'coaching_weekly_recap' THEN COALESCE(notif_weekly_report, true)
    WHEN 'weekly_report' THEN COALESCE(notif_weekly_report, true)
    WHEN 'anniversary' THEN COALESCE(notif_anniversary, true)
    WHEN 'views_peak' THEN COALESCE(notif_views_peak, true)
    WHEN 'personal_record' THEN COALESCE(notif_personal_record, true)
    WHEN 'premium_expiring' THEN COALESCE(notif_premium_expiring, true)
    WHEN 'strava_to_associate' THEN COALESCE(notif_strava_to_associate, true)
    ELSE true
  END
  INTO allowed
  FROM public.profiles
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN true;
  END IF;

  RETURN COALESCE(allowed, true);
END;
$$;

COMMENT ON FUNCTION public.profile_allows_notification_type(uuid, text) IS
  'Retourne false si la préférence profil pour ce type de notification est désactivée.';

-- Demandes de suivi
CREATE OR REPLACE FUNCTION public.handle_follow_request_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  follower_profile RECORD;
BEGIN
  IF NOT public.profile_allows_notification_type(NEW.following_id, 'follow_request') THEN
    RETURN NEW;
  END IF;

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

-- Invitations club
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
  IF NOT public.profile_allows_notification_type(NEW.invited_user_id, 'club_invitation') THEN
    RETURN NEW;
  END IF;

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

-- Participant accepté → organisateur
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

  IF NOT public.profile_allows_notification_type(session_info.organizer_id, 'session_accepted') THEN
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

-- Demandes de participation
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

  IF NOT public.profile_allows_notification_type(session_info.organizer_id, 'session_request') THEN
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

-- Messages privés
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

  IF NOT public.profile_allows_notification_type(recipient_id, 'message') THEN
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

-- Sessions d'amis (premium)
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
      AND public.profile_allows_notification_type(friend_record.friend_id, 'friend_session')
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
