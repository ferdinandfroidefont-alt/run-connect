-- Créer une table pour gérer les parrainages
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reward_given BOOLEAN DEFAULT false,
  UNIQUE(referred_id) -- Un utilisateur ne peut être parrainé qu'une fois
);

-- Ajouter un code de parrainage aux profils
ALTER TABLE public.profiles 
ADD COLUMN referral_code TEXT UNIQUE;

-- Créer un index sur le code de parrainage pour une recherche rapide
CREATE INDEX idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX idx_referrals_referral_code ON public.referrals(referral_code);

-- Activer RLS sur la table referrals
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Politique pour voir ses propres parrainages (en tant qu'inviteur ou invité)
CREATE POLICY "Users can view their referrals" ON public.referrals
  FOR SELECT
  USING (referrer_id = auth.uid() OR referred_id = auth.uid());

-- Politique pour insérer des parrainages (système uniquement)
CREATE POLICY "System can insert referrals" ON public.referrals
  FOR INSERT
  WITH CHECK (true);

-- Politique pour mettre à jour les récompenses (système uniquement)
CREATE POLICY "System can update referral rewards" ON public.referrals
  FOR UPDATE
  USING (true);

-- Fonction pour générer un code de parrainage unique
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    code TEXT;
    exists_check BOOLEAN;
BEGIN
    LOOP
        -- Générer un code de 8 caractères alphanumériques
        code := upper(substring(encode(gen_random_bytes(6), 'base64') from 1 for 8));
        -- Remplacer les caractères non-alphanumériques
        code := regexp_replace(code, '[^A-Z0-9]', '0', 'g');
        
        -- Vérifier si le code existe déjà
        SELECT EXISTS(
            SELECT 1 FROM profiles 
            WHERE referral_code = code
        ) INTO exists_check;
        
        -- Si le code n'existe pas, on peut l'utiliser
        IF NOT exists_check THEN
            RETURN code;
        END IF;
    END LOOP;
END;
$$;

-- Mettre à jour la fonction handle_new_user pour générer un code de parrainage
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  username_base TEXT;
  username_final TEXT;
  counter INTEGER := 1;
  new_referral_code TEXT;
BEGIN
  -- Générer un nom d'utilisateur de base à partir de l'email ou user ID
  IF NEW.email IS NOT NULL THEN
    username_base := split_part(NEW.email, '@', 1);
  ELSE
    username_base := 'user' || substring(NEW.id::text, 1, 8);
  END IF;
  
  -- Nettoyer le nom d'utilisateur (enlever caractères spéciaux)
  username_base := regexp_replace(username_base, '[^a-zA-Z0-9_]', '', 'g');
  username_final := username_base;
  
  -- S'assurer que le nom d'utilisateur est unique
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = username_final) LOOP
    username_final := username_base || counter::text;
    counter := counter + 1;
  END LOOP;
  
  -- Générer un code de parrainage unique
  new_referral_code := generate_referral_code();
  
  -- Créer le profil avec l'email, un nom d'utilisateur unique et un code de parrainage
  INSERT INTO public.profiles (
    user_id,
    username,
    display_name,
    referral_code,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    username_final,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email, username_final),
    new_referral_code,
    NOW(),
    NOW()
  );
  
  RETURN NEW;
END;
$$;

-- Fonction pour traiter un parrainage
CREATE OR REPLACE FUNCTION public.process_referral(referral_code_param TEXT, new_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_user_id UUID;
  existing_referral_count INTEGER;
BEGIN
  -- Trouver l'utilisateur qui a ce code de parrainage
  SELECT user_id INTO referrer_user_id
  FROM profiles
  WHERE referral_code = referral_code_param;
  
  -- Si le code n'existe pas ou c'est le même utilisateur
  IF referrer_user_id IS NULL OR referrer_user_id = new_user_id THEN
    RETURN FALSE;
  END IF;
  
  -- Vérifier que le nouvel utilisateur n'a pas déjà été parrainé
  SELECT COUNT(*) INTO existing_referral_count
  FROM referrals
  WHERE referred_id = new_user_id;
  
  IF existing_referral_count > 0 THEN
    RETURN FALSE;
  END IF;
  
  -- Créer l'entrée de parrainage
  INSERT INTO referrals (referrer_id, referred_id, referral_code)
  VALUES (referrer_user_id, new_user_id, referral_code_param);
  
  -- Donner 1 jour de premium à l'inviteur
  -- D'abord, vérifier s'il a déjà un abonnement
  INSERT INTO subscribers (user_id, email, subscribed, subscription_tier, subscription_end)
  SELECT 
    referrer_user_id,
    au.email,
    true,
    'Premium',
    GREATEST(
      COALESCE(s.subscription_end, NOW()),
      NOW()
    ) + INTERVAL '1 day'
  FROM auth.users au
  LEFT JOIN subscribers s ON s.user_id = referrer_user_id
  WHERE au.id = referrer_user_id
  ON CONFLICT (user_id) 
  DO UPDATE SET
    subscribed = true,
    subscription_tier = 'Premium',
    subscription_end = GREATEST(
      COALESCE(subscribers.subscription_end, NOW()),
      NOW()
    ) + INTERVAL '1 day',
    updated_at = NOW();
  
  -- Marquer la récompense comme donnée
  UPDATE referrals 
  SET reward_given = true
  WHERE referrer_id = referrer_user_id AND referred_id = new_user_id;
  
  RETURN TRUE;
END;
$$;

-- Fonction pour obtenir les statistiques de parrainage d'un utilisateur
CREATE OR REPLACE FUNCTION public.get_referral_stats(user_id_param UUID)
RETURNS TABLE(
  referral_code TEXT,
  total_referrals INTEGER,
  total_rewards INTEGER
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.referral_code,
    COALESCE(COUNT(r.id), 0)::INTEGER as total_referrals,
    COALESCE(COUNT(r.id) FILTER (WHERE r.reward_given = true), 0)::INTEGER as total_rewards
  FROM profiles p
  LEFT JOIN referrals r ON r.referrer_id = p.user_id
  WHERE p.user_id = user_id_param
  GROUP BY p.referral_code;
$$;