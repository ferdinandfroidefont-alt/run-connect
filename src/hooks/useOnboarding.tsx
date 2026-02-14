import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const useOnboarding = () => {
  const { user } = useAuth();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkOnboardingStatus = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    // ✅ FIX: Check localStorage safety flags to prevent loop
    const profileCreatedFlag = localStorage.getItem('profileCreatedSuccessfully');
    const completedTimestamp = localStorage.getItem(`profileSetupCompleted_${user.id}`);
    
    if (profileCreatedFlag === 'true') {
      console.log('✅ [Onboarding] profileCreatedSuccessfully flag found - skipping');
      setNeedsOnboarding(false);
      setNeedsProfileSetup(false);
      setLoading(false);
      return;
    }
    
    if (completedTimestamp) {
      const elapsed = Date.now() - parseInt(completedTimestamp, 10);
      if (elapsed < 60000) {
        console.log('✅ [Onboarding] profileSetupCompleted flag found (within 60s) - skipping');
        setNeedsOnboarding(false);
        setNeedsProfileSetup(false);
        setLoading(false);
        return;
      }
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

      console.log('Profile data:', profile);

      if (!profile) {
        console.log('No profile found - new user needs onboarding');
        setNeedsOnboarding(true);
        setNeedsProfileSetup(false);
      } else {
        const hasRequiredFields = profile.username?.trim() && 
          profile.display_name?.trim() && 
          profile.avatar_url?.trim() &&
          profile.age && 
          profile.phone?.trim() && 
          profile.bio?.trim();

        console.log('Profile fields check:', {
          username: !!profile.username?.trim(),
          display_name: !!profile.display_name?.trim(),
          avatar_url: !!profile.avatar_url?.trim(),
          age: !!profile.age,
          phone: !!profile.phone?.trim(),
          bio: !!profile.bio?.trim(),
          hasRequiredFields: !!hasRequiredFields
        });

        if (!hasRequiredFields) {
          console.log('Existing user with incomplete profile - needs profile setup');
          setNeedsOnboarding(false);
          setNeedsProfileSetup(true);
        } else {
          console.log('Profile is complete');
          // Clean up ALL localStorage flags since profile is confirmed complete
          localStorage.removeItem(`profileSetupCompleted_${user.id}`);
          localStorage.removeItem('profileCreatedSuccessfully');
          localStorage.removeItem('profileCreatedAt');
          setNeedsOnboarding(false);
          setNeedsProfileSetup(false);
        }
      }
    } catch (error) {
      console.error('Error in checkOnboardingStatus:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkOnboardingStatus();
  }, [checkOnboardingStatus]);

  const completeOnboarding = () => {
    setNeedsOnboarding(false);
  };

  const completeProfileSetup = useCallback(() => {
    if (user) {
      // Set localStorage safety flag
      localStorage.setItem(`profileSetupCompleted_${user.id}`, Date.now().toString());
    }
    setNeedsProfileSetup(false);
  }, [user]);

  // ✅ FIX: Expose recheckOnboarding to re-query DB after profile setup
  const recheckOnboarding = useCallback(async () => {
    console.log('🔄 [Onboarding] recheckOnboarding called');
    await checkOnboardingStatus();
  }, [checkOnboardingStatus]);

  return {
    needsOnboarding,
    needsProfileSetup,
    loading,
    completeOnboarding,
    completeProfileSetup,
    recheckOnboarding
  };
};
