-- Fix RLS policies for notifications table
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

-- Allow system to insert notifications (for triggers)
CREATE POLICY "System can create notifications" 
ON notifications FOR INSERT 
WITH CHECK (true);

-- Users can view their own notifications  
CREATE POLICY "Users can view their own notifications" 
ON notifications FOR SELECT 
USING (auth.uid() = user_id);

-- Users can update their own notifications
CREATE POLICY "Users can update their own notifications" 
ON notifications FOR UPDATE 
USING (auth.uid() = user_id);

-- Add missing triggers that were defined but not created
DROP TRIGGER IF EXISTS on_follow_request_created ON user_follows;
CREATE TRIGGER on_follow_request_created
  AFTER INSERT ON user_follows
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION trigger_follow_request_notification();

-- Also fix the search_path for all functions to avoid security warnings
ALTER FUNCTION public.trigger_follow_request_notification() SET search_path = public;
ALTER FUNCTION public.handle_new_follow() SET search_path = public;
ALTER FUNCTION public.accept_follow_request(uuid) SET search_path = public;
ALTER FUNCTION public.get_follower_count(uuid) SET search_path = public;
ALTER FUNCTION public.get_following_count(uuid) SET search_path = public;