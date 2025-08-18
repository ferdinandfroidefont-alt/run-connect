-- Add status to user_follows for pending/accepted requests
ALTER TABLE public.user_follows 
ADD COLUMN status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted'));

-- Update existing follows to be accepted
UPDATE public.user_follows SET status = 'accepted';

-- Create function to count followers
CREATE OR REPLACE FUNCTION public.get_follower_count(profile_user_id uuid)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.user_follows 
  WHERE following_id = profile_user_id AND status = 'accepted';
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Create function to count following
CREATE OR REPLACE FUNCTION public.get_following_count(profile_user_id uuid)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.user_follows 
  WHERE follower_id = profile_user_id AND status = 'accepted';
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Create trigger to create notification when someone follows
CREATE OR REPLACE FUNCTION public.handle_new_follow()
RETURNS TRIGGER AS $$
BEGIN
  -- Create notification for the followed user
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
    'Quelqu''un souhaite vous suivre',
    jsonb_build_object(
      'follower_id', NEW.follower_id,
      'follow_id', NEW.id
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new follows
CREATE TRIGGER on_user_follow_created
  AFTER INSERT ON public.user_follows
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_follow();

-- Create function to accept follow request
CREATE OR REPLACE FUNCTION public.accept_follow_request(follow_id uuid)
RETURNS boolean AS $$
BEGIN
  UPDATE public.user_follows 
  SET status = 'accepted'
  WHERE id = follow_id AND following_id = auth.uid();
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;