-- Create function to properly delete all user data
CREATE OR REPLACE FUNCTION public.delete_user_data(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete from notifications (both sent and received)
  DELETE FROM public.notifications WHERE user_id = target_user_id;
  
  -- Delete from user_follows (both following and followers)
  DELETE FROM public.user_follows WHERE follower_id = target_user_id OR following_id = target_user_id;
  
  -- Delete from blocked_users (both blocking and blocked)
  DELETE FROM public.blocked_users WHERE blocker_id = target_user_id OR blocked_id = target_user_id;
  
  -- Delete from user_scores
  DELETE FROM public.user_scores WHERE user_id = target_user_id;
  
  -- Delete from subscribers
  DELETE FROM public.subscribers WHERE user_id = target_user_id;
  
  -- Delete from daily_message_limits
  DELETE FROM public.daily_message_limits WHERE user_id = target_user_id;
  
  -- Delete from referrals (both referrer and referred)
  DELETE FROM public.referrals WHERE referrer_id = target_user_id OR referred_id = target_user_id;
  
  -- Delete from session_participants
  DELETE FROM public.session_participants WHERE user_id = target_user_id;
  
  -- Delete from session_requests
  DELETE FROM public.session_requests WHERE user_id = target_user_id;
  
  -- Delete from sessions organized by user
  DELETE FROM public.sessions WHERE organizer_id = target_user_id;
  
  -- Delete from routes created by user
  DELETE FROM public.routes WHERE created_by = target_user_id;
  
  -- Delete from messages sent by user
  DELETE FROM public.messages WHERE sender_id = target_user_id;
  
  -- Delete from group_members
  DELETE FROM public.group_members WHERE user_id = target_user_id;
  
  -- Delete from conversations where user is participant or creator
  DELETE FROM public.conversations 
  WHERE participant_1 = target_user_id 
     OR participant_2 = target_user_id 
     OR created_by = target_user_id;
  
  -- Delete from club_invitations
  DELETE FROM public.club_invitations WHERE inviter_id = target_user_id OR invited_user_id = target_user_id;
  
  -- Finally, delete the profile
  DELETE FROM public.profiles WHERE user_id = target_user_id;
  
  RAISE NOTICE 'Successfully deleted all data for user %', target_user_id;
END;
$$;