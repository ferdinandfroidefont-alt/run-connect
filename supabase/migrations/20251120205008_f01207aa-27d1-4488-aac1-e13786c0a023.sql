-- Réparer tous les comptes orphelins (auth.users sans profil dans public.profiles)
INSERT INTO public.profiles (user_id, username, display_name, referral_code, created_at, updated_at)
SELECT 
  au.id as user_id,
  split_part(au.email, '@', 1) as username,
  COALESCE(au.raw_user_meta_data->>'display_name', split_part(au.email, '@', 1)) as display_name,
  generate_referral_code() as referral_code,
  au.created_at,
  now() as updated_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.user_id
WHERE p.id IS NULL
ON CONFLICT (user_id) DO NOTHING;