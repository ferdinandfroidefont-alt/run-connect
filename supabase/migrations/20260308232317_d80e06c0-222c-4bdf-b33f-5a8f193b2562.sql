CREATE OR REPLACE FUNCTION public.trigger_follow_request_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  follower_profile RECORD;
  existing_notif_id uuid;
BEGIN
  -- Only trigger on pending follow requests
  IF NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;

  -- Dedup: check for existing notification for same follower->following within 24h
  SELECT id INTO existing_notif_id
  FROM notifications
  WHERE user_id = NEW.following_id
    AND type = 'follow_request'
    AND (data->>'follower_id')::text = NEW.follower_id::text
    AND created_at > now() - interval '24 hours';
  
  IF existing_notif_id IS NOT NULL THEN
    RETURN NEW; -- Skip duplicate
  END IF;

  SELECT username, display_name, avatar_url 
  INTO follower_profile FROM profiles WHERE user_id = NEW.follower_id;

  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    NEW.following_id, 'follow_request',
    'Nouvelle demande de suivi',
    COALESCE(follower_profile.display_name, follower_profile.username, 'Quelqu''un') || ' souhaite vous suivre',
    json_build_object(
      'follow_id', NEW.id,
      'follower_id', NEW.follower_id,
      'follower_name', COALESCE(follower_profile.display_name, follower_profile.username),
      'follower_avatar', follower_profile.avatar_url
    )::jsonb
  );
  RETURN NEW;
END;
$$;