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

// Custom event name for tutorial restart
const TUTORIAL_RESTART_EVENT = 'tutorial-restart';

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

      // Show tutorial only if onboarding is complete but tutorial is not
      if (profile?.onboarding_completed && !profile?.tutorial_completed) {
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

  // 🔥 Listen for tutorial restart event from other components
  useEffect(() => {
    const handleTutorialRestart = () => {
      console.log('🎯 [TUTORIAL] Received restart event, showing tutorial immediately');
      setShouldShowTutorial(true);
    };

    window.addEventListener(TUTORIAL_RESTART_EVENT, handleTutorialRestart);
    
    return () => {
      window.removeEventListener(TUTORIAL_RESTART_EVENT, handleTutorialRestart);
    };
  }, []);

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

  // Restart tutorial (for settings) - dispatches global event
  const restartTutorial = useCallback(async () => {
    if (!user) return;

    try {
      await supabase
        .from('profiles')
        .update({ tutorial_completed: false })
        .eq('user_id', user.id);

      // 🔥 Dispatch global event so other useTutorial instances can react
      console.log('🎯 [TUTORIAL] Dispatching restart event');
      window.dispatchEvent(new CustomEvent(TUTORIAL_RESTART_EVENT));
      
      // Also update local state
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
