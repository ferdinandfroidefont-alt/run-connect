-- Give ferdinand.froidefont@gmail.com permanent premium access
INSERT INTO public.subscribers (
  email,
  user_id,
  subscribed,
  subscription_tier,
  subscription_end,
  stripe_customer_id,
  created_at,
  updated_at
) VALUES (
  'ferdinand.froidefont@gmail.com',
  (SELECT id FROM auth.users WHERE email = 'ferdinand.froidefont@gmail.com'),
  true,
  'Admin',
  '2099-12-31 23:59:59+00'::timestamptz, -- Far future date
  'admin_override',
  now(),
  now()
) ON CONFLICT (email) DO UPDATE SET
  subscribed = true,
  subscription_tier = 'Admin',
  subscription_end = '2099-12-31 23:59:59+00'::timestamptz,
  updated_at = now();

-- Also update the profile to mark as premium
UPDATE public.profiles 
SET is_premium = true, updated_at = now()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ferdinand.froidefont@gmail.com');