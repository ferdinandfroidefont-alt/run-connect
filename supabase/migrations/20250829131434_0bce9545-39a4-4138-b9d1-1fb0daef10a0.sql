-- Étape 3: Correction des fonctions sans search_path sécurisé

-- Corriger toutes les fonctions qui n'ont pas de search_path défini
ALTER FUNCTION public.trigger_follow_request_notification() SET search_path = public;
ALTER FUNCTION public.accept_follow_request(uuid) SET search_path = public;
ALTER FUNCTION public.get_follower_count(uuid) SET search_path = public;
ALTER FUNCTION public.get_following_count(uuid) SET search_path = public;
ALTER FUNCTION public.handle_club_invitation() SET search_path = public;
ALTER FUNCTION public.accept_club_invitation(uuid) SET search_path = public;
ALTER FUNCTION public.decline_club_invitation(uuid) SET search_path = public;
ALTER FUNCTION public.get_public_profile(uuid) SET search_path = public;
ALTER FUNCTION public.get_email_from_username(text) SET search_path = public;
ALTER FUNCTION public.increment_daily_message_count(uuid) SET search_path = public;
ALTER FUNCTION public.get_daily_message_count(uuid) SET search_path = public;
ALTER FUNCTION public.can_user_send_message(uuid) SET search_path = public;
ALTER FUNCTION public.are_users_friends(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.process_referral(text, uuid) SET search_path = public;
ALTER FUNCTION public.get_referral_stats(uuid) SET search_path = public;
ALTER FUNCTION public.reward_session_creation() SET search_path = public;
ALTER FUNCTION public.reward_session_participation() SET search_path = public;
ALTER FUNCTION public.update_push_token(uuid, text) SET search_path = public;
ALTER FUNCTION public.add_user_points(uuid, integer) SET search_path = public;
ALTER FUNCTION public.generate_referral_code() SET search_path = public;
ALTER FUNCTION public.remove_session_points() SET search_path = public;
ALTER FUNCTION public.remove_participation_points() SET search_path = public;
ALTER FUNCTION public.get_common_clubs(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.remove_user_points(uuid, integer) SET search_path = public;
ALTER FUNCTION public.get_safe_public_profile(uuid) SET search_path = public;
ALTER FUNCTION public.get_safe_public_profiles(uuid[]) SET search_path = public;
ALTER FUNCTION public.cleanup_expired_sessions() SET search_path = public;
ALTER FUNCTION public.anonymize_user_data(uuid) SET search_path = public;
ALTER FUNCTION public.prevent_user_id_change() SET search_path = public;