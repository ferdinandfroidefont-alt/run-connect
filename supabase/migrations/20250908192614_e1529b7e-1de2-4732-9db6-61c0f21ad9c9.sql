-- Améliorer la fonction d'anonymisation pour supprimer les données liées
CREATE OR REPLACE FUNCTION public.anonymize_user_data(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Supprimer les notifications envoyées à cet utilisateur
  DELETE FROM notifications WHERE user_id = target_user_id;
  
  -- Supprimer les notifications créées par cet utilisateur (par exemple, les demandes de suivi)
  DELETE FROM notifications WHERE data->>'follower_id' = target_user_id::text;
  DELETE FROM notifications WHERE data->>'inviter_id' = target_user_id::text;
  
  -- Supprimer les relations de suivi
  DELETE FROM user_follows WHERE follower_id = target_user_id OR following_id = target_user_id;
  
  -- Supprimer les utilisateurs bloqués
  DELETE FROM blocked_users WHERE blocker_id = target_user_id OR blocked_id = target_user_id;
  
  -- Supprimer les invitations de club
  DELETE FROM club_invitations WHERE inviter_id = target_user_id OR invited_user_id = target_user_id;
  
  -- Supprimer les participations aux sessions
  DELETE FROM session_participants WHERE user_id = target_user_id;
  
  -- Supprimer les demandes de session
  DELETE FROM session_requests WHERE user_id = target_user_id;
  
  -- Supprimer les sessions créées par l'utilisateur
  DELETE FROM sessions WHERE organizer_id = target_user_id;
  
  -- Supprimer les routes créées
  DELETE FROM routes WHERE created_by = target_user_id;
  
  -- Supprimer des groupes/clubs
  DELETE FROM group_members WHERE user_id = target_user_id;
  
  -- Supprimer les conversations créées par l'utilisateur (clubs)
  DELETE FROM conversations WHERE created_by = target_user_id AND is_group = true;
  
  -- Supprimer les conversations privées où l'utilisateur est participant
  DELETE FROM conversations WHERE (participant_1 = target_user_id OR participant_2 = target_user_id) AND is_group = false;
  
  -- Supprimer les messages de l'utilisateur
  DELETE FROM messages WHERE sender_id = target_user_id;
  
  -- Supprimer les scores de l'utilisateur
  DELETE FROM user_scores WHERE user_id = target_user_id;
  
  -- Supprimer les limites de messages quotidiennes
  DELETE FROM daily_message_limits WHERE user_id = target_user_id;
  
  -- Supprimer les parrainages
  DELETE FROM referrals WHERE referrer_id = target_user_id OR referred_id = target_user_id;
  
  -- Anonymiser les données dans subscribers (au lieu de supprimer pour garder les traces de paiement)
  UPDATE subscribers 
  SET 
    email = 'deleted_' || id::text || '@anonymized.local',
    stripe_customer_id = NULL
  WHERE user_id = target_user_id;
  
  -- Anonymiser les données dans profiles (au lieu de supprimer pour éviter les erreurs de foreign key)
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
    is_private = true,  -- Rendre le profil privé
    allow_friend_suggestions = false  -- Désactiver les suggestions d'amis
  WHERE user_id = target_user_id;
END;
$function$;