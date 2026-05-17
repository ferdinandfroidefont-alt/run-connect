-- Parrainage : Premium conforme à la page produit (1 jour / parrainé, 1 semaine / filleul, paliers).

CREATE OR REPLACE FUNCTION public.grant_premium_days(p_user_id uuid, p_days integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_days IS NULL OR p_days <= 0 THEN
    RETURN;
  END IF;

  INSERT INTO subscribers (user_id, email, subscribed, subscription_tier, subscription_end)
  SELECT
    p_user_id,
    au.email,
    true,
    'Premium',
    GREATEST(COALESCE(s.subscription_end, NOW()), NOW()) + (p_days || ' days')::interval
  FROM auth.users au
  LEFT JOIN subscribers s ON s.user_id = p_user_id
  WHERE au.id = p_user_id
  ON CONFLICT (user_id) DO UPDATE SET
    subscribed = true,
    subscription_tier = 'Premium',
    subscription_end = GREATEST(COALESCE(subscribers.subscription_end, NOW()), NOW()) + (p_days || ' days')::interval,
    updated_at = NOW();

  UPDATE profiles
  SET is_premium = true, updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_premium_lifetime(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO subscribers (user_id, email, subscribed, subscription_tier, subscription_end)
  SELECT
    p_user_id,
    au.email,
    true,
    'Premium',
    '2099-12-31 23:59:59+00'::timestamptz
  FROM auth.users au
  WHERE au.id = p_user_id
  ON CONFLICT (user_id) DO UPDATE SET
    subscribed = true,
    subscription_tier = 'Premium',
    subscription_end = '2099-12-31 23:59:59+00'::timestamptz,
    updated_at = NOW();

  UPDATE profiles
  SET is_premium = true, updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_referrer_id(referral_code_param text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer uuid;
  v_code text := UPPER(TRIM(referral_code_param));
BEGIN
  IF v_code IS NULL OR v_code = '' THEN
    RETURN NULL;
  END IF;

  SELECT user_id INTO v_referrer
  FROM profiles
  WHERE UPPER(referral_code) = v_code
  LIMIT 1;

  IF v_referrer IS NOT NULL THEN
    RETURN v_referrer;
  END IF;

  SELECT user_id INTO v_referrer
  FROM referral_links
  WHERE UPPER(unique_code) = v_code
  LIMIT 1;

  RETURN v_referrer;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_referral_milestone_bonuses(p_referrer_id uuid, p_total_referrals integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_total_referrals = 3 THEN
    PERFORM grant_premium_days(p_referrer_id, 7);
  ELSIF p_total_referrals = 10 THEN
    PERFORM grant_premium_days(p_referrer_id, 30);
  ELSIF p_total_referrals = 25 THEN
    PERFORM grant_premium_days(p_referrer_id, 365);
  ELSIF p_total_referrals = 50 THEN
    PERFORM grant_premium_lifetime(p_referrer_id);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_referral(referral_code_param text, new_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_user_id uuid;
  referral_count integer;
  inserted_rows integer;
  normalized_code text := UPPER(TRIM(referral_code_param));
BEGIN
  referrer_user_id := resolve_referrer_id(normalized_code);

  IF referrer_user_id IS NULL OR referrer_user_id = new_user_id THEN
    RETURN false;
  END IF;

  IF EXISTS (SELECT 1 FROM referrals WHERE referred_id = new_user_id) THEN
    RETURN false;
  END IF;

  INSERT INTO referrals (referrer_id, referred_id, referral_code)
  VALUES (referrer_user_id, new_user_id, normalized_code)
  ON CONFLICT (referred_id) DO NOTHING;

  GET DIAGNOSTICS inserted_rows = ROW_COUNT;
  IF inserted_rows = 0 THEN
    RETURN false;
  END IF;

  -- Parrain : 1 jour Premium par filleul
  PERFORM grant_premium_days(referrer_user_id, 1);
  -- Filleul : 1 semaine offerte
  PERFORM grant_premium_days(new_user_id, 7);

  SELECT COUNT(*)::integer INTO referral_count
  FROM referrals
  WHERE referrer_id = referrer_user_id;

  PERFORM apply_referral_milestone_bonuses(referrer_user_id, referral_count);

  UPDATE referrals
  SET reward_given = true
  WHERE referrer_id = referrer_user_id AND referred_id = new_user_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_referral_stats(user_id_param uuid)
RETURNS TABLE(referral_code text, total_referrals bigint, total_rewards bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_count bigint;
  v_days bigint;
BEGIN
  SELECT p.referral_code INTO v_code
  FROM profiles p
  WHERE p.user_id = user_id_param;

  SELECT COUNT(*)::bigint INTO v_count
  FROM referrals r
  WHERE r.referrer_id = user_id_param;

  v_days := v_count * 1;
  IF v_count >= 3 THEN v_days := v_days + 7; END IF;
  IF v_count >= 10 THEN v_days := v_days + 30; END IF;
  IF v_count >= 25 THEN v_days := v_days + 365; END IF;

  RETURN QUERY SELECT COALESCE(v_code, ''), v_count, v_days;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_referral_history(user_id_param uuid)
RETURNS TABLE(
  referred_id uuid,
  display_name text,
  username text,
  avatar_url text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.referred_id,
    COALESCE(p.display_name, p.username, 'Coureur') AS display_name,
    p.username,
    p.avatar_url,
    r.created_at
  FROM referrals r
  JOIN profiles p ON p.user_id = r.referred_id
  WHERE r.referrer_id = user_id_param
  ORDER BY r.created_at DESC
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION public.grant_premium_days(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.grant_premium_lifetime(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.resolve_referrer_id(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_referral_milestone_bonuses(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.process_referral(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_referral_stats(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_referral_history(uuid) TO authenticated, service_role;
