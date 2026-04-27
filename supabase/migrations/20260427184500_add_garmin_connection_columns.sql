alter table public.profiles
  add column if not exists garmin_connected boolean default false,
  add column if not exists garmin_user_id text,
  add column if not exists garmin_access_token text,
  add column if not exists garmin_refresh_token text,
  add column if not exists garmin_token_expires_at timestamptz,
  add column if not exists garmin_verified_at timestamptz;
