-- Supprimer les triggers en double pour éviter les notifications dupliquées
DROP TRIGGER IF EXISTS on_user_follow_created ON user_follows;
DROP FUNCTION IF EXISTS public.handle_new_follow();

-- Garder seulement le trigger spécifique pour les demandes de suivi
-- Le trigger on_follow_request_created avec la fonction trigger_follow_request_notification() 
-- est déjà en place et fonctionne correctement