-- Ajouter les colonnes de préférences de notifications si elles n'existent pas
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS notif_follow_request boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notif_message boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notif_session_request boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notif_friend_session boolean DEFAULT false;