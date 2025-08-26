-- Mettre à jour les fonctions RLS pour exclure le statut 'unfollowed'

-- Modifier la fonction are_users_friends pour ignorer les relations 'unfollowed'
CREATE OR REPLACE FUNCTION public.are_users_friends(user1_id uuid, user2_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    -- Check if user1 follows user2 (accepted, not unfollowed)
    SELECT 1 FROM user_follows 
    WHERE follower_id = user1_id 
      AND following_id = user2_id 
      AND status = 'accepted'
  ) AND EXISTS (
    -- Check if user2 follows user1 (accepted, not unfollowed)  
    SELECT 1 FROM user_follows 
    WHERE follower_id = user2_id 
      AND following_id = user1_id 
      AND status = 'accepted'
  );
$$;

-- Modifier les fonctions de comptage pour exclure 'unfollowed'
CREATE OR REPLACE FUNCTION public.get_follower_count(profile_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.user_follows 
  WHERE following_id = profile_user_id AND status = 'accepted';
$$;

CREATE OR REPLACE FUNCTION public.get_following_count(profile_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.user_follows 
  WHERE follower_id = profile_user_id AND status = 'accepted';
$$;