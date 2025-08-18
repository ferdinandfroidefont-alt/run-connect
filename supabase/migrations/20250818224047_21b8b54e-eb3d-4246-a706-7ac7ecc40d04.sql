-- Fix the trigger function to use correct column name
CREATE OR REPLACE FUNCTION trigger_follow_request_notification()
RETURNS TRIGGER AS $$
DECLARE
  follower_profile RECORD;
BEGIN
  -- Get follower profile information
  SELECT username, display_name, avatar_url 
  INTO follower_profile
  FROM profiles 
  WHERE user_id = NEW.follower_id;

  -- Create notification for the user being followed (corrected column name)
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    data
  ) VALUES (
    NEW.following_id,  -- Changed from followed_id to following_id
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;