-- Ajouter les nouvelles préférences de notification
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS notif_club_invitation BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notif_session_accepted BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notif_presence_confirmed BOOLEAN DEFAULT true;

-- Commentaires pour la documentation
COMMENT ON COLUMN public.profiles.notif_club_invitation IS 'Receive notifications when invited to a club';
COMMENT ON COLUMN public.profiles.notif_session_accepted IS 'Receive notifications when someone joins your session';
COMMENT ON COLUMN public.profiles.notif_presence_confirmed IS 'Receive notifications when organizer confirms your presence';