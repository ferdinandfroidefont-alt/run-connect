-- Table des défis disponibles
CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('sessions', 'referral', 'social')),
  title TEXT NOT NULL,
  description TEXT,
  target_value INTEGER NOT NULL,
  reward_points INTEGER NOT NULL,
  icon TEXT NOT NULL,
  validation_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des défis actifs des utilisateurs
CREATE TABLE IF NOT EXISTS public.user_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0,
  target INTEGER NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  week_start DATE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, challenge_id, week_start)
);

-- Historique des défis complétés
CREATE TABLE IF NOT EXISTS public.challenge_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id),
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reward_points INTEGER NOT NULL,
  week_start DATE NOT NULL
);

-- Liens de parrainage uniques
CREATE TABLE IF NOT EXISTS public.referral_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unique_code TEXT NOT NULL UNIQUE,
  share_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_shared_at TIMESTAMP WITH TIME ZONE
);

-- RLS Policies
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_links ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut voir les défis disponibles
CREATE POLICY "Challenges are viewable by everyone" ON public.challenges
  FOR SELECT USING (true);

-- Les utilisateurs peuvent voir leurs propres défis actifs
CREATE POLICY "Users can view their own challenges" ON public.user_challenges
  FOR SELECT USING (auth.uid() = user_id);

-- Les utilisateurs peuvent voir leur historique
CREATE POLICY "Users can view their challenge history" ON public.challenge_history
  FOR SELECT USING (auth.uid() = user_id);

-- Les utilisateurs peuvent voir et gérer leur lien de parrainage
CREATE POLICY "Users can view their referral link" ON public.referral_links
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their referral link" ON public.referral_links
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their referral link" ON public.referral_links
  FOR UPDATE USING (auth.uid() = user_id);

-- Fonction pour obtenir le début de la semaine courante
CREATE OR REPLACE FUNCTION get_current_week_start()
RETURNS DATE AS $$
BEGIN
  RETURN DATE_TRUNC('week', NOW() AT TIME ZONE 'Europe/Paris')::DATE;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour attribuer un nouveau défi aléatoire d'une catégorie
CREATE OR REPLACE FUNCTION assign_random_challenge(
  p_user_id UUID,
  p_category TEXT
)
RETURNS UUID AS $$
DECLARE
  v_challenge_id UUID;
  v_target INTEGER;
  v_week_start DATE;
BEGIN
  v_week_start := get_current_week_start();
  
  -- Sélectionner un défi aléatoire de la catégorie qui n'est pas déjà actif
  SELECT c.id, c.target_value INTO v_challenge_id, v_target
  FROM challenges c
  WHERE c.category = p_category
    AND NOT EXISTS (
      SELECT 1 FROM user_challenges uc
      WHERE uc.user_id = p_user_id
        AND uc.challenge_id = c.id
        AND uc.week_start = v_week_start
        AND uc.status = 'active'
    )
  ORDER BY RANDOM()
  LIMIT 1;
  
  IF v_challenge_id IS NOT NULL THEN
    INSERT INTO user_challenges (user_id, challenge_id, target, week_start, progress, status)
    VALUES (p_user_id, v_challenge_id, v_target, v_week_start, 0, 'active');
  END IF;
  
  RETURN v_challenge_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour initialiser les défis d'un utilisateur
CREATE OR REPLACE FUNCTION initialize_user_challenges(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_week_start DATE;
BEGIN
  v_week_start := get_current_week_start();
  
  -- Vérifier si l'utilisateur a déjà des défis pour cette semaine
  IF NOT EXISTS (
    SELECT 1 FROM user_challenges 
    WHERE user_id = p_user_id 
    AND week_start = v_week_start
  ) THEN
    -- Attribuer un défi de chaque catégorie
    PERFORM assign_random_challenge(p_user_id, 'sessions');
    PERFORM assign_random_challenge(p_user_id, 'referral');
    PERFORM assign_random_challenge(p_user_id, 'social');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour compléter un défi et en attribuer un nouveau
CREATE OR REPLACE FUNCTION complete_challenge(
  p_user_challenge_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
  v_challenge_id UUID;
  v_category TEXT;
  v_reward_points INTEGER;
  v_week_start DATE;
BEGIN
  -- Récupérer les infos du défi
  SELECT uc.user_id, uc.challenge_id, c.category, c.reward_points, uc.week_start
  INTO v_user_id, v_challenge_id, v_category, v_reward_points, v_week_start
  FROM user_challenges uc
  JOIN challenges c ON c.id = uc.challenge_id
  WHERE uc.id = p_user_challenge_id
    AND uc.status = 'active';
  
  IF v_user_id IS NOT NULL THEN
    -- Marquer le défi comme complété
    UPDATE user_challenges
    SET status = 'completed', completed_at = NOW(), updated_at = NOW()
    WHERE id = p_user_challenge_id;
    
    -- Ajouter à l'historique
    INSERT INTO challenge_history (user_id, challenge_id, reward_points, week_start)
    VALUES (v_user_id, v_challenge_id, v_reward_points, v_week_start);
    
    -- Ajouter les points
    PERFORM add_user_points(v_user_id, v_reward_points);
    
    -- Attribuer un nouveau défi de la même catégorie
    PERFORM assign_random_challenge(v_user_id, v_category);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour incrémenter la progression d'un défi
CREATE OR REPLACE FUNCTION increment_challenge_progress(
  p_user_id UUID,
  p_validation_type TEXT,
  p_increment INTEGER DEFAULT 1
)
RETURNS VOID AS $$
DECLARE
  v_challenge RECORD;
BEGIN
  -- Trouver les défis actifs correspondant au type de validation
  FOR v_challenge IN
    SELECT uc.id, uc.progress, uc.target
    FROM user_challenges uc
    JOIN challenges c ON c.id = uc.challenge_id
    WHERE uc.user_id = p_user_id
      AND uc.status = 'active'
      AND uc.week_start = get_current_week_start()
      AND c.validation_type = p_validation_type
  LOOP
    -- Incrémenter la progression
    UPDATE user_challenges
    SET progress = progress + p_increment, updated_at = NOW()
    WHERE id = v_challenge.id;
    
    -- Vérifier si le défi est complété
    IF (v_challenge.progress + p_increment) >= v_challenge.target THEN
      PERFORM complete_challenge(v_challenge.id);
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour valider défis de participation aux sessions
CREATE OR REPLACE FUNCTION validate_session_participation_challenges()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.confirmed_by_creator = true AND (OLD.confirmed_by_creator IS NULL OR OLD.confirmed_by_creator = false) THEN
    PERFORM increment_challenge_progress(NEW.user_id, 'session_participation', 1);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_validate_session_participation
AFTER INSERT OR UPDATE ON session_participants
FOR EACH ROW
EXECUTE FUNCTION validate_session_participation_challenges();

-- Trigger pour valider défis d'organisation de sessions
CREATE OR REPLACE FUNCTION validate_session_creation_challenges()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM increment_challenge_progress(NEW.organizer_id, 'session_creation', 1);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_validate_session_creation
AFTER INSERT ON sessions
FOR EACH ROW
EXECUTE FUNCTION validate_session_creation_challenges();

-- Trigger pour valider défis d'envoi de messages
CREATE OR REPLACE FUNCTION validate_message_challenges()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Message texte
    IF NEW.message_type = 'text' THEN
      PERFORM increment_challenge_progress(NEW.sender_id, 'send_message', 1);
    END IF;
    
    -- Message vocal
    IF NEW.message_type = 'voice' THEN
      PERFORM increment_challenge_progress(NEW.sender_id, 'send_voice', 1);
    END IF;
    
    -- Photo
    IF NEW.message_type = 'image' THEN
      PERFORM increment_challenge_progress(NEW.sender_id, 'send_photo', 1);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_validate_message_challenges
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION validate_message_challenges();

-- Trigger pour valider défis d'ajout d'amis
CREATE OR REPLACE FUNCTION validate_friend_challenges()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    PERFORM increment_challenge_progress(NEW.follower_id, 'add_friend', 1);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_validate_friend_challenges
AFTER UPDATE ON user_follows
FOR EACH ROW
EXECUTE FUNCTION validate_friend_challenges();

-- Trigger pour valider défis de parrainage
CREATE OR REPLACE FUNCTION validate_referral_challenges()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM increment_challenge_progress(NEW.referrer_id, 'refer_friend', 1);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_validate_referral_challenges
AFTER INSERT ON referrals
FOR EACH ROW
EXECUTE FUNCTION validate_referral_challenges();

-- Trigger pour valider défis de rejoindre un club
CREATE OR REPLACE FUNCTION validate_join_club_challenges()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM increment_challenge_progress(NEW.user_id, 'join_club', 1);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_validate_join_club_challenges
AFTER INSERT ON group_members
FOR EACH ROW
EXECUTE FUNCTION validate_join_club_challenges();

-- Insérer les défis de base
INSERT INTO challenges (category, title, description, target_value, reward_points, icon, validation_type) VALUES
-- Catégorie Sessions
('sessions', 'Participer à 1 session', 'Rejoins une session confirmée par l''organisateur', 1, 30, 'Target', 'session_participation'),
('sessions', 'Participer à 3 sessions', 'Rejoins 3 sessions cette semaine', 3, 100, 'Trophy', 'session_participation'),
('sessions', 'Organiser 1 session', 'Crée une session pour ta communauté', 1, 50, 'Calendar', 'session_creation'),
('sessions', 'Organiser 3 sessions', 'Organise 3 sessions cette semaine', 3, 150, 'Award', 'session_creation'),

-- Catégorie Parrainage
('referral', 'Inviter 1 ami', 'Invite un ami à rejoindre RunConnect', 1, 100, 'UserPlus', 'refer_friend'),
('referral', 'Inviter 3 amis', 'Partage RunConnect avec 3 personnes', 3, 300, 'Users', 'refer_friend'),

-- Catégorie Social
('social', 'Envoyer 3 messages', 'Communique avec ta communauté', 3, 30, 'MessageCircle', 'send_message'),
('social', 'Envoyer 1 message vocal', 'Envoie un message vocal', 1, 50, 'Mic', 'send_voice'),
('social', 'Envoyer 1 photo', 'Partage une photo', 1, 40, 'Image', 'send_photo'),
('social', 'Ajouter 1 ami', 'Connecte-toi avec un nouveau membre', 1, 50, 'Heart', 'add_friend'),
('social', 'Ajouter 3 amis', 'Élargis ton réseau', 3, 150, 'Users', 'add_friend'),
('social', 'Rejoindre un club', 'Trouve un club qui te correspond', 1, 75, 'Flag', 'join_club');

-- Créer un index pour améliorer les performances
CREATE INDEX idx_user_challenges_user_week ON user_challenges(user_id, week_start, status);
CREATE INDEX idx_user_challenges_validation ON user_challenges(user_id, status) 
  WHERE status = 'active';
CREATE INDEX idx_challenges_category ON challenges(category);
CREATE INDEX idx_referral_links_code ON referral_links(unique_code);