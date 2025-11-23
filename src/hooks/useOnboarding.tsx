import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const useOnboarding = () => {
  const { user } = useAuth();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);
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

      console.log('Profile data:', profile);

      // Distinguer entre nouveau utilisateur et utilisateur existant avec profil incomplet
      if (!profile) {
        // Pas de profil = nouveau utilisateur complet
        console.log('No profile found - new user needs onboarding');
        setNeedsOnboarding(true);
        setNeedsProfileSetup(false);
      } else {
        // Profil existe mais champs manquants
        const hasRequiredFields = profile.username?.trim() && 
          profile.display_name?.trim() && 
          profile.avatar_url?.trim() && // Avatar obligatoire
          profile.age && 
          profile.phone?.trim() && 
          profile.bio?.trim();

        console.log('📊 Profile data retrieved:', {
          profile: profile,
          avatar_url: profile?.avatar_url,
          avatar_url_length: profile?.avatar_url?.length,
          all_fields: {
            username: profile?.username,
            display_name: profile?.display_name,
            avatar_url: profile?.avatar_url,
            age: profile?.age,
            phone: profile?.phone,
            bio: profile?.bio
          }
        });

        console.log('Profile fields check:', {
          username: !!profile.username?.trim(),
          display_name: !!profile.display_name?.trim(),
          avatar_url: !!profile.avatar_url?.trim(),
          age: !!profile.age,
          phone: !!profile.phone?.trim(),
          bio: !!profile.bio?.trim(),
          hasRequiredFields: hasRequiredFields
        });

        if (!hasRequiredFields) {
          // Utilisateur existant avec profil incomplet
          console.log('Existing user with incomplete profile - needs profile setup');
          setNeedsOnboarding(false);
          setNeedsProfileSetup(true);
        } else {
          // Profil complet
          console.log('Profile is complete');
          setNeedsOnboarding(false);
          setNeedsProfileSetup(false);
        }
      }
    } catch (error) {
      console.error('Error in checkOnboardingStatus:', error);
    } finally {
      setLoading(false);
    }
  };

  const completeOnboarding = () => {
    setNeedsOnboarding(false);
  };

  const completeProfileSetup = () => {
    setNeedsProfileSetup(false);
  };

  return {
    needsOnboarding,
    needsProfileSetup,
    loading,
    completeOnboarding,
    completeProfileSetup
  };
};