import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const useOnboarding = () => {
  const { user } = useAuth();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [needsWelcomeVideo, setNeedsWelcomeVideo] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkOnboardingStatus();
  }, [user]);

  const checkOnboardingStatus = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('onboarding_completed, created_at, username, display_name, avatar_url, age, phone, bio')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking onboarding status:', error);
        setLoading(false);
        return;
      }

      // Vérifier que tous les champs obligatoires sont remplis
      const hasRequiredFields = profile && 
        profile.username?.trim() && 
        profile.display_name?.trim() && 
        profile.avatar_url?.trim() && 
        profile.age && 
        profile.phone?.trim() && 
        profile.bio?.trim() &&
        profile.onboarding_completed;

      // L'utilisateur a besoin d'onboarding si le profil n'existe pas ou si des champs obligatoires manquent
      setNeedsOnboarding(!hasRequiredFields);
      
      // Vérifier si l'utilisateur a besoin de voir la vidéo de bienvenue
      // Pour les nouveaux utilisateurs (créés dans les dernières 24h)
      const isNewUser = profile?.created_at && 
        Date.now() - new Date(profile.created_at).getTime() < 24 * 60 * 60 * 1000; // 24 heures
      
      // Pour le moment, on vérifie via localStorage jusqu'à ce que le champ soit disponible
      const hasSeenVideo = localStorage.getItem(`welcome_video_seen_${user.id}`) === 'true';
      setNeedsWelcomeVideo(!!isNewUser && !hasSeenVideo);
    } catch (error) {
      console.error('Error in checkOnboardingStatus:', error);
    } finally {
      setLoading(false);
    }
  };

  const completeOnboarding = () => {
    setNeedsOnboarding(false);
  };

  const markVideoAsSeen = async () => {
    if (!user) return;

    try {
      // Pour le moment, utiliser localStorage jusqu'à ce que les types soient mis à jour
      localStorage.setItem(`welcome_video_seen_${user.id}`, 'true');
      
      // Essayer de mettre à jour la base de données (peut échouer si les types ne sont pas encore à jour)
      try {
        await supabase
          .from('profiles')
          .update({ welcome_video_seen: true } as any)
          .eq('user_id', user.id);
      } catch (dbError) {
        console.log('DB update will work once types are refreshed:', dbError);
      }
      
      setNeedsWelcomeVideo(false);
    } catch (error) {
      console.error('Error marking video as seen:', error);
    }
  };

  const showWelcomeVideo = () => {
    setNeedsWelcomeVideo(true);
  };

  return {
    needsOnboarding,
    needsWelcomeVideo,
    loading,
    completeOnboarding,
    markVideoAsSeen,
    showWelcomeVideo
  };
};