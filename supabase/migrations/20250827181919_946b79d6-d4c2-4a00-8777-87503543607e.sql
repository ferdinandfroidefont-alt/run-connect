-- Générer des codes de parrainage pour tous les utilisateurs existants qui n'en ont pas
UPDATE public.profiles 
SET referral_code = generate_referral_code()
WHERE referral_code IS NULL;