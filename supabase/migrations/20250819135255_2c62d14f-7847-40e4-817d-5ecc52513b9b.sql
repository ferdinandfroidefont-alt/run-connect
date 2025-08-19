-- Ajouter les colonnes pour l'onboarding et les acceptations RGPD/sécurité
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS notifications_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS rgpd_accepted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS security_rules_accepted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;