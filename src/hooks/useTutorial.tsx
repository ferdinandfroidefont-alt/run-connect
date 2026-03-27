import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { getDefaultOnboardingSteps } from '@/lib/tutorials/onboardingSteps';
import { requestTutorialReplay } from '@/lib/tutorials/registry';
import type { TutorialStep } from '@/lib/tutorials/types';

export type { TutorialStep };

export const useTutorial = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [shouldShowTutorial, setShouldShowTutorial] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if user has completed the tutorial
  const checkTutorialStatus = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('tutorial_completed, onboarding_completed')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error checking tutorial status:', error);
        setLoading(false);
        return;
      }

      // Show tutorial for any user who hasn't completed it yet
      if (!profile?.tutorial_completed) {
        // Small delay to ensure UI is ready
        setTimeout(() => {
          setShouldShowTutorial(true);
        }, 500);
      } else {
        setShouldShowTutorial(false);
      }
    } catch (error) {
      console.error('Error in checkTutorialStatus:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial check on mount
  useEffect(() => {
    checkTutorialStatus();
  }, [checkTutorialStatus]);

  const tutorialSteps: TutorialStep[] = getDefaultOnboardingSteps(t);

  // Mark tutorial as completed
  const completeTutorial = useCallback(async () => {
    if (!user) return;

    try {
      await supabase
        .from('profiles')
        .update({ tutorial_completed: true })
        .eq('user_id', user.id);

      setShouldShowTutorial(false);
    } catch (error) {
      console.error('Error completing tutorial:', error);
    }
  }, [user]);

  /** Rejouer le tutoriel complet depuis l’aide — sans réinitialiser le profil (voir TutorialReplayHost). */
  const restartTutorial = useCallback(() => {
    requestTutorialReplay('full');
  }, []);

  // Skip tutorial
  const skipTutorial = useCallback(async () => {
    await completeTutorial();
  }, [completeTutorial]);

  return {
    shouldShowTutorial,
    tutorialSteps,
    loading,
    completeTutorial,
    restartTutorial,
    skipTutorial,
  };
};
