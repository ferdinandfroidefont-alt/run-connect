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
        .select('onboarding_completed, welcome_video_seen, created_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking onboarding status:', error);
        setLoading(false);
        return;
      }

      // Si le profil n'a pas complété l'onboarding ou a été créé récemment
      const createdRecently = profile?.created_at && 
        Date.now() - new Date(profile.created_at).getTime() < 5 * 60 * 1000; // 5 minutes

      setNeedsOnboarding(!profile?.onboarding_completed || !!createdRecently);
      
      // Vérifier si l'utilisateur a besoin de voir la vidéo de bienvenue
      const isNewUser = profile?.created_at && 
        Date.now() - new Date(profile.created_at).getTime() < 24 * 60 * 60 * 1000; // 24 heures
      
      setNeedsWelcomeVideo(isNewUser && !profile?.welcome_video_seen);
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
      await supabase
        .from('profiles')
        .update({ welcome_video_seen: true })
        .eq('user_id', user.id);
      
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