
-- ============================================
-- Sécuriser les dernières fonctions restantes
-- ============================================

-- update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- get_user_group_conversations
CREATE OR REPLACE FUNCTION public.get_user_group_conversations(user_id_param uuid)
RETURNS TABLE(conversation_id uuid)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT gm.conversation_id
  FROM group_members gm
  WHERE gm.user_id = user_id_param;
END;
$$;

-- get_follower_count
CREATE OR REPLACE FUNCTION public.get_follower_count(profile_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.user_follows 
  WHERE following_id = profile_user_id AND status = 'accepted';
$$;

-- get_following_count
CREATE OR REPLACE FUNCTION public.get_following_count(profile_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.user_follows 
  WHERE follower_id = profile_user_id AND status = 'accepted';
$$;

-- get_complete_leaderboard
CREATE OR REPLACE FUNCTION public.get_complete_leaderboard(limit_count integer DEFAULT 50, offset_count integer DEFAULT 0, order_by_column text DEFAULT 'total_points'::text)
RETURNS TABLE(user_id uuid, username text, display_name text, avatar_url text, total_points integer, weekly_points integer, seasonal_points integer, is_premium boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.user_id,
    p.username,
    p.display_name,
    CASE WHEN p.is_private = false THEN p.avatar_url ELSE NULL END as avatar_url,
    COALESCE(us.total_points, 0) as total_points,
    COALESCE(us.weekly_points, 0) as weekly_points,
    COALESCE(us.seasonal_points, 0) as seasonal_points,
    p.is_premium
  FROM profiles p
  LEFT JOIN user_scores us ON p.user_id = us.user_id
  WHERE (p.is_private = false OR p.is_private IS NULL)
  ORDER BY 
    CASE 
      WHEN order_by_column = 'total_points' THEN COALESCE(us.total_points, 0)
      WHEN order_by_column = 'seasonal_points' THEN COALESCE(us.seasonal_points, 0)
      WHEN order_by_column = 'weekly_points' THEN COALESCE(us.weekly_points, 0)
      ELSE COALESCE(us.total_points, 0)
    END DESC,
    p.created_at ASC
  LIMIT limit_count
  OFFSET offset_count;
$$;

-- get_leaderboard_total_count
CREATE OR REPLACE FUNCTION public.get_leaderboard_total_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM profiles p
  WHERE (p.is_private = false OR p.is_private IS NULL);
$$;

-- accept_follow_request
CREATE OR REPLACE FUNCTION public.accept_follow_request(follow_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_follows 
  SET status = 'accepted'
  WHERE id = follow_id AND following_id = auth.uid();
  
  RETURN FOUND;
END;
$$;

-- get_friend_suggestions
CREATE OR REPLACE FUNCTION public.get_friend_suggestions(current_user_id uuid, suggestion_limit integer DEFAULT 10)
RETURNS TABLE(user_id uuid, username text, display_name text, avatar_url text, mutual_friends_count bigint, mutual_friend_names text[], source text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH user_follows_status AS (
    SELECT following_id as user_id
    FROM user_follows 
    WHERE follower_id = current_user_id
  ),
  mutual_friends_info AS (
    SELECT 
      p.user_id,
      COUNT(CASE WHEN uf1.following_id IS NOT NULL THEN 1 END) as mutual_count,
      ARRAY_AGG(mp.display_name ORDER BY mp.display_name) FILTER (WHERE mp.display_name IS NOT NULL AND uf1.following_id IS NOT NULL) as friend_names
    FROM profiles p
    LEFT JOIN user_follows uf_current ON uf_current.following_id = p.user_id 
      AND uf_current.follower_id = current_user_id 
      AND uf_current.status = 'accepted'
    LEFT JOIN user_follows uf1 ON uf1.follower_id = p.user_id 
      AND uf1.status = 'accepted'
      AND uf1.following_id IN (
        SELECT following_id FROM user_follows 
        WHERE follower_id = current_user_id AND status = 'accepted'
      )
    LEFT JOIN profiles mp ON mp.user_id = uf1.following_id
    WHERE p.user_id != current_user_id
      AND p.user_id NOT IN (SELECT ufs.user_id FROM user_follows_status ufs)
      AND uf_current.following_id IS NULL
    GROUP BY p.user_id
  ),
  all_available_users AS (
    SELECT 
      p.user_id,
      p.username,
      p.display_name,
      p.avatar_url,
      COALESCE(mfi.mutual_count, 0) as mutual_friends_count,
      COALESCE(mfi.friend_names, ARRAY[]::text[]) as mutual_friend_names,
      CASE 
        WHEN COALESCE(mfi.mutual_count, 0) > 0 THEN 'mutual_friends'
        WHEN p.last_seen > NOW() - INTERVAL '7 days' THEN 'active_users'
        ELSE 'other_users'
      END as source,
      (EXTRACT(EPOCH FROM DATE_TRUNC('hour', NOW()))::bigint + 
       ('x' || substr(md5(p.user_id::text), 1, 8))::bit(32)::bigint) as rotation_seed
    FROM profiles p
    LEFT JOIN mutual_friends_info mfi ON mfi.user_id = p.user_id
    WHERE p.user_id != current_user_id
      AND p.user_id NOT IN (SELECT ufs.user_id FROM user_follows_status ufs)
  )
  SELECT 
    anu.user_id,
    anu.username,
    anu.display_name,
    anu.avatar_url,
    anu.mutual_friends_count,
    anu.mutual_friend_names,
    anu.source
  FROM all_available_users anu
  ORDER BY 
    CASE 
      WHEN anu.source = 'mutual_friends' THEN 1 
      WHEN anu.source = 'active_users' THEN 2 
      ELSE 3 
    END,
    anu.mutual_friends_count DESC,
    (anu.rotation_seed % 1000000)
  LIMIT suggestion_limit;
$$;

-- get_public_profile_safe
CREATE OR REPLACE FUNCTION public.get_public_profile_safe(profile_user_id uuid)
RETURNS TABLE(id uuid, user_id uuid, username text, display_name text, avatar_url text, bio text, age integer, is_premium boolean, created_at timestamp with time zone, running_records jsonb, cycling_records jsonb, swimming_records jsonb, triathlon_records jsonb, walking_records jsonb, is_online boolean, last_seen timestamp with time zone)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.bio,
    CASE WHEN p.is_private = false THEN p.age ELSE NULL END as age,
    p.is_premium,
    p.created_at,
    CASE WHEN p.is_private = false THEN p.running_records ELSE '{}'::jsonb END as running_records,
    CASE WHEN p.is_private = false THEN p.cycling_records ELSE '{}'::jsonb END as cycling_records,
    CASE WHEN p.is_private = false THEN p.swimming_records ELSE '{}'::jsonb END as swimming_records,
    CASE WHEN p.is_private = false THEN p.triathlon_records ELSE '{}'::jsonb END as triathlon_records,
    CASE WHEN p.is_private = false THEN p.walking_records ELSE '{}'::jsonb END as walking_records,
    CASE WHEN p.show_online_status = true AND p.is_private = false THEN p.is_online ELSE false END as is_online,
    CASE WHEN p.show_online_status = true AND p.is_private = false THEN p.last_seen ELSE NULL END as last_seen
  FROM public.profiles p
  WHERE p.user_id = profile_user_id
    AND p.user_id != auth.uid();
$$;

-- anonymize_user_data
CREATE OR REPLACE FUNCTION public.anonymize_user_data(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM notifications WHERE user_id = target_user_id;
  DELETE FROM notifications WHERE data->>'follower_id' = target_user_id::text;
  DELETE FROM notifications WHERE data->>'inviter_id' = target_user_id::text;
  DELETE FROM user_follows WHERE follower_id = target_user_id OR following_id = target_user_id;
  DELETE FROM blocked_users WHERE blocker_id = target_user_id OR blocked_id = target_user_id;
  DELETE FROM club_invitations WHERE inviter_id = target_user_id OR invited_user_id = target_user_id;
  DELETE FROM session_participants WHERE user_id = target_user_id;
  DELETE FROM session_requests WHERE user_id = target_user_id;
  DELETE FROM sessions WHERE organizer_id = target_user_id;
  DELETE FROM routes WHERE created_by = target_user_id;
  DELETE FROM group_members WHERE user_id = target_user_id;
  DELETE FROM conversations WHERE created_by = target_user_id AND is_group = true;
  DELETE FROM conversations WHERE (participant_1 = target_user_id OR participant_2 = target_user_id) AND is_group = false;
  DELETE FROM messages WHERE sender_id = target_user_id;
  DELETE FROM user_scores WHERE user_id = target_user_id;
  DELETE FROM daily_message_limits WHERE user_id = target_user_id;
  DELETE FROM referrals WHERE referrer_id = target_user_id OR referred_id = target_user_id;
  
  UPDATE subscribers 
  SET 
    email = 'deleted_' || id::text || '@anonymized.local',
    stripe_customer_id = NULL
  WHERE user_id = target_user_id;
  
  UPDATE profiles 
  SET 
    username = 'deleted_' || id::text,
    display_name = 'Utilisateur supprimé',
    bio = NULL,
    phone = NULL,
    avatar_url = NULL,
    push_token = NULL,
    strava_access_token = NULL,
    strava_refresh_token = NULL,
    instagram_access_token = NULL,
    is_private = true,
    allow_friend_suggestions = false
  WHERE user_id = target_user_id;
END;
$$;

-- get_public_profile
CREATE OR REPLACE FUNCTION public.get_public_profile(profile_user_id uuid)
RETURNS TABLE(id uuid, user_id uuid, username text, display_name text, avatar_url text, bio text, created_at timestamp with time zone)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.bio,
    p.created_at
  FROM public.profiles p
  WHERE p.user_id = profile_user_id;
$$;

-- is_user_blocked
CREATE OR REPLACE FUNCTION public.is_user_blocked(blocker_user_id uuid, blocked_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM blocked_users 
    WHERE blocker_id = blocker_user_id 
    AND blocked_id = blocked_user_id
  );
$$;

-- block_user
CREATE OR REPLACE FUNCTION public.block_user(user_to_block_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM user_follows 
  WHERE (follower_id = auth.uid() AND following_id = user_to_block_id)
     OR (follower_id = user_to_block_id AND following_id = auth.uid());
  
  INSERT INTO blocked_users (blocker_id, blocked_id)
  VALUES (auth.uid(), user_to_block_id)
  ON CONFLICT (blocker_id, blocked_id) DO NOTHING;
  
  RETURN TRUE;
END;
$$;

-- generate_club_code
CREATE OR REPLACE FUNCTION public.generate_club_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    code TEXT;
    exists_check BOOLEAN;
BEGIN
    LOOP
        code := upper(substring(encode(gen_random_bytes(6), 'base64') from 1 for 8));
        code := regexp_replace(code, '[^A-Z0-9]', '0', 'g');
        
        SELECT EXISTS(
            SELECT 1 FROM conversations 
            WHERE club_code = code
        ) INTO exists_check;
        
        IF NOT exists_check THEN
            RETURN code;
        END IF;
    END LOOP;
END;
$$;

-- increment_daily_message_count
CREATE OR REPLACE FUNCTION public.increment_daily_message_count(user_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
BEGIN
  INSERT INTO public.daily_message_limits (user_id, date, message_count)
  VALUES (user_id_param, CURRENT_DATE, 1)
  ON CONFLICT (user_id, date) 
  DO UPDATE SET 
    message_count = daily_message_limits.message_count + 1,
    updated_at = now()
  RETURNING message_count INTO current_count;
  
  RETURN current_count;
END;
$$;

-- delete_user_data
CREATE OR REPLACE FUNCTION public.delete_user_data(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.notifications WHERE user_id = target_user_id;
  DELETE FROM public.user_follows WHERE follower_id = target_user_id OR following_id = target_user_id;
  DELETE FROM public.blocked_users WHERE blocker_id = target_user_id OR blocked_id = target_user_id;
  DELETE FROM public.user_scores WHERE user_id = target_user_id;
  DELETE FROM public.subscribers WHERE user_id = target_user_id;
  DELETE FROM public.daily_message_limits WHERE user_id = target_user_id;
  DELETE FROM public.referrals WHERE referrer_id = target_user_id OR referred_id = target_user_id;
  DELETE FROM public.session_participants WHERE user_id = target_user_id;
  DELETE FROM public.session_requests WHERE user_id = target_user_id;
  DELETE FROM public.sessions WHERE organizer_id = target_user_id;
  DELETE FROM public.routes WHERE created_by = target_user_id;
  DELETE FROM public.messages WHERE sender_id = target_user_id;
  DELETE FROM public.group_members WHERE user_id = target_user_id;
  DELETE FROM public.conversations 
  WHERE participant_1 = target_user_id 
     OR participant_2 = target_user_id 
     OR created_by = target_user_id;
  DELETE FROM public.club_invitations WHERE inviter_id = target_user_id OR invited_user_id = target_user_id;
  DELETE FROM public.profiles WHERE user_id = target_user_id;
  
  RAISE NOTICE 'Successfully deleted all data for user %', target_user_id;
END;
$$;

-- get_email_from_username
CREATE OR REPLACE FUNCTION public.get_email_from_username(username_param text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT au.email
  FROM public.profiles p
  JOIN auth.users au ON p.user_id = au.id
  WHERE p.username = username_param;
$$;

-- get_daily_message_count
CREATE OR REPLACE FUNCTION public.get_daily_message_count(user_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
BEGIN
  SELECT message_count INTO current_count
  FROM public.daily_message_limits
  WHERE user_id = user_id_param AND date = CURRENT_DATE;
  
  RETURN COALESCE(current_count, 0);
END;
$$;

-- can_user_send_message
CREATE OR REPLACE FUNCTION public.can_user_send_message(user_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
  is_premium BOOLEAN;
BEGIN
  SELECT subscribed INTO is_premium
  FROM public.subscribers
  WHERE user_id = user_id_param OR email = (
    SELECT email FROM auth.users WHERE id = user_id_param
  );
  
  IF COALESCE(is_premium, false) = true THEN
    RETURN true;
  END IF;
  
  SELECT get_daily_message_count(user_id_param) INTO current_count;
  
  RETURN current_count < 3;
END;
$$;

-- are_users_friends
CREATE OR REPLACE FUNCTION public.are_users_friends(user1_id uuid, user2_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_follows 
    WHERE follower_id = user1_id 
      AND following_id = user2_id 
      AND status = 'accepted'
  ) AND EXISTS (
    SELECT 1 FROM user_follows 
    WHERE follower_id = user2_id 
      AND following_id = user1_id 
      AND status = 'accepted'
  );
$$;

-- process_referral
CREATE OR REPLACE FUNCTION public.process_referral(referral_code_param text, new_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_user_id UUID;
  existing_referral_count INTEGER;
BEGIN
  SELECT user_id INTO referrer_user_id
  FROM profiles
  WHERE referral_code = referral_code_param;
  
  IF referrer_user_id IS NULL OR referrer_user_id = new_user_id THEN
    RETURN FALSE;
  END IF;
  
  SELECT COUNT(*) INTO existing_referral_count
  FROM referrals
  WHERE referred_id = new_user_id;
  
  IF existing_referral_count > 0 THEN
    RETURN FALSE;
  END IF;
  
  INSERT INTO referrals (referrer_id, referred_id, referral_code)
  VALUES (referrer_user_id, new_user_id, referral_code_param);
  
  INSERT INTO subscribers (user_id, email, subscribed, subscription_tier, subscription_end)
  SELECT 
    referrer_user_id,
    au.email,
    true,
    'Premium',
    GREATEST(
      COALESCE(s.subscription_end, NOW()),
      NOW()
    ) + INTERVAL '1 day'
  FROM auth.users au
  LEFT JOIN subscribers s ON s.user_id = referrer_user_id
  WHERE au.id = referrer_user_id
  ON CONFLICT (user_id) 
  DO UPDATE SET
    subscribed = true,
    subscription_tier = 'Premium',
    subscription_end = GREATEST(
      COALESCE(subscribers.subscription_end, NOW()),
      NOW()
    ) + INTERVAL '1 day',
    updated_at = NOW();
  
  UPDATE referrals 
  SET reward_given = true
  WHERE referrer_id = referrer_user_id AND referred_id = new_user_id;
  
  RETURN TRUE;
END;
$$;

-- get_referral_stats
CREATE OR REPLACE FUNCTION public.get_referral_stats(user_id_param uuid)
RETURNS TABLE(referral_code text, total_referrals integer, total_rewards integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.referral_code,
    COALESCE(COUNT(r.id), 0)::INTEGER as total_referrals,
    COALESCE(COUNT(r.id) FILTER (WHERE r.reward_given = true), 0)::INTEGER as total_rewards
  FROM profiles p
  LEFT JOIN referrals r ON r.referrer_id = p.user_id
  WHERE p.user_id = user_id_param
  GROUP BY p.referral_code;
$$;

-- update_push_token
CREATE OR REPLACE FUNCTION public.update_push_token(user_id_param uuid, push_token_param text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles 
  SET push_token = push_token_param, updated_at = now()
  WHERE user_id = user_id_param;
END;
$$;

-- add_user_points
CREATE OR REPLACE FUNCTION public.add_user_points(user_id_param uuid, points_to_add integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_scores (user_id, total_points, weekly_points, seasonal_points, updated_at)
  VALUES (user_id_param, points_to_add, points_to_add, points_to_add, now())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    total_points = user_scores.total_points + points_to_add,
    weekly_points = user_scores.weekly_points + points_to_add,
    seasonal_points = user_scores.seasonal_points + points_to_add,
    updated_at = now();
END;
$$;

-- generate_referral_code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    code TEXT;
    exists_check BOOLEAN;
BEGIN
    LOOP
        code := upper(
            substring(md5(random()::text) from 1 for 8)
        );
        code := translate(code, 'abcdef', '012345');
        
        SELECT EXISTS(
            SELECT 1 FROM profiles 
            WHERE referral_code = code
        ) INTO exists_check;
        
        IF NOT exists_check THEN
            RETURN code;
        END IF;
    END LOOP;
END;
$$;

-- get_common_clubs
CREATE OR REPLACE FUNCTION public.get_common_clubs(user_1_id uuid, user_2_id uuid)
RETURNS TABLE(club_id uuid, club_name text, club_description text, club_avatar_url text, club_code text, created_by uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    c.id,
    c.group_name,
    c.group_description,
    c.group_avatar_url,
    c.club_code,
    c.created_by
  FROM conversations c
  WHERE c.is_group = true
    AND c.id IN (
      SELECT gm1.conversation_id 
      FROM group_members gm1 
      WHERE gm1.user_id = user_1_id
    )
    AND c.id IN (
      SELECT gm2.conversation_id 
      FROM group_members gm2 
      WHERE gm2.user_id = user_2_id
    );
END;
$$;

-- remove_user_points
CREATE OR REPLACE FUNCTION public.remove_user_points(user_id_param uuid, points_to_remove integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_scores 
  SET 
    total_points = GREATEST(0, total_points - points_to_remove),
    weekly_points = GREATEST(0, weekly_points - points_to_remove),
    seasonal_points = GREATEST(0, seasonal_points - points_to_remove),
    updated_at = now()
  WHERE user_id = user_id_param;
END;
$$;

-- get_safe_public_profile
CREATE OR REPLACE FUNCTION public.get_safe_public_profile(profile_user_id uuid)
RETURNS TABLE(user_id uuid, username text, display_name text, avatar_url text, bio text, is_premium boolean, created_at timestamp with time zone, is_online boolean, show_online_status boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.user_id,
    p.username,
    p.display_name,
    CASE WHEN p.is_private = false THEN p.avatar_url ELSE NULL END as avatar_url,
    CASE WHEN p.is_private = false THEN p.bio ELSE NULL END as bio,
    p.is_premium,
    p.created_at,
    CASE WHEN p.show_online_status = true AND p.is_private = false THEN p.is_online ELSE false END as is_online,
    CASE WHEN p.is_private = false THEN p.show_online_status ELSE false END as show_online_status
  FROM public.profiles p
  WHERE p.user_id = profile_user_id
    AND p.user_id != auth.uid()
    AND p.is_private = false;
$$;

-- get_safe_public_profiles
CREATE OR REPLACE FUNCTION public.get_safe_public_profiles(profile_user_ids uuid[])
RETURNS TABLE(user_id uuid, username text, display_name text, avatar_url text, bio text, is_premium boolean, created_at timestamp with time zone, is_online boolean, show_online_status boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.user_id,
    p.username,
    p.display_name,
    CASE WHEN p.is_private = false THEN p.avatar_url ELSE NULL END as avatar_url,
    CASE WHEN p.is_private = false THEN p.bio ELSE NULL END as bio,
    p.is_premium,
    p.created_at,
    CASE WHEN p.show_online_status = true AND p.is_private = false THEN p.is_online ELSE false END as is_online,
    CASE WHEN p.is_private = false THEN p.show_online_status ELSE false END as show_online_status
  FROM public.profiles p
  WHERE p.user_id = ANY(profile_user_ids)
    AND p.user_id != auth.uid()
    AND (p.is_private = false OR p.is_private IS NULL);
$$;

-- accept_club_invitation
CREATE OR REPLACE FUNCTION public.accept_club_invitation(invitation_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation_record RECORD;
BEGIN
  SELECT * INTO invitation_record
  FROM club_invitations
  WHERE id = invitation_id 
    AND invited_user_id = auth.uid()
    AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  UPDATE club_invitations
  SET status = 'accepted', updated_at = now()
  WHERE id = invitation_id;
  
  INSERT INTO group_members (conversation_id, user_id, is_admin)
  VALUES (invitation_record.club_id, invitation_record.invited_user_id, false)
  ON CONFLICT (conversation_id, user_id) DO NOTHING;
  
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

-- decline_club_invitation
CREATE OR REPLACE FUNCTION public.decline_club_invitation(invitation_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- check_user_exists
CREATE OR REPLACE FUNCTION public.check_user_exists(email_param text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_exists boolean;
  user_email_confirmed boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = email_param) INTO user_exists;
  
  IF user_exists THEN
    SELECT email_confirmed_at IS NOT NULL 
    FROM auth.users 
    WHERE email = email_param 
    INTO user_email_confirmed;
    
    RETURN jsonb_build_object(
      'exists', true,
      'email_confirmed', user_email_confirmed
    );
  ELSE
    RETURN jsonb_build_object('exists', false, 'email_confirmed', false);
  END IF;
END;
$$;

-- trigger_season_reset
CREATE OR REPLACE FUNCTION public.trigger_season_reset()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT net.http_post(
    url := 'https://dbptgehpknjsoisirviz.supabase.co/functions/v1/season-reset',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRicHRnZWhwa25qc29pc2lydml6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NjIxNDUsImV4cCI6MjA3MDIzODE0NX0.D1uw0ui_auBAi-dvodv6j2a9x3lvMnY69cDa9Wupjcs"}'::jsonb,
    body := '{"trigger": "cron"}'::jsonb
  );
$$;

-- cleanup_audit_logs
CREATE OR REPLACE FUNCTION public.cleanup_audit_logs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM audit_log
  WHERE timestamp < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
