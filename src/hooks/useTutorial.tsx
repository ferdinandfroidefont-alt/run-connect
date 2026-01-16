import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';

export interface TutorialStep {
  target: string;
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  disableBeacon?: boolean;
}

export const useTutorial = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [shouldShowTutorial, setShouldShowTutorial] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if user has completed the tutorial
  useEffect(() => {
    const checkTutorialStatus = async () => {
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

        // Show tutorial only if onboarding is complete but tutorial is not
        if (profile?.onboarding_completed && !profile?.tutorial_completed) {
          // Small delay to ensure UI is ready
          setTimeout(() => {
            setShouldShowTutorial(true);
          }, 1000);
        }
      } catch (error) {
        console.error('Error in checkTutorialStatus:', error);
      } finally {
        setLoading(false);
      }
    };

    checkTutorialStatus();
  }, [user]);

  // Tutorial steps with translations
  const tutorialSteps: TutorialStep[] = [
    {
      target: '[data-tutorial="map-container"]',
      title: t('tutorial.mapTitle'),
      content: t('tutorial.mapContent'),
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tutorial="create-session"]',
      title: t('tutorial.createTitle'),
      content: t('tutorial.createContent'),
      placement: 'top',
    },
    {
      target: '[data-tutorial="nav-sessions"]',
      title: t('tutorial.sessionsTitle'),
      content: t('tutorial.sessionsContent'),
      placement: 'top',
    },
    {
      target: '[data-tutorial="nav-messages"]',
      title: t('tutorial.messagesTitle'),
      content: t('tutorial.messagesContent'),
      placement: 'top',
    },
    {
      target: '[data-tutorial="nav-feed"]',
      title: t('tutorial.feedTitle'),
      content: t('tutorial.feedContent'),
      placement: 'top',
    },
    {
      target: '[data-tutorial="profile-avatar"]',
      title: t('tutorial.profileTitle'),
      content: t('tutorial.profileContent'),
      placement: 'bottom',
    },
    {
      target: '[data-tutorial="notifications"]',
      title: t('tutorial.notificationsTitle'),
      content: t('tutorial.notificationsContent'),
      placement: 'bottom',
    },
  ];

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

  // Restart tutorial (for settings)
  const restartTutorial = useCallback(async () => {
    if (!user) return;

    try {
      await supabase
        .from('profiles')
        .update({ tutorial_completed: false })
        .eq('user_id', user.id);

      setShouldShowTutorial(true);
    } catch (error) {
      console.error('Error restarting tutorial:', error);
    }
  }, [user]);

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
