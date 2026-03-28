import { lazy, Suspense } from "react";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useTutorial } from "@/hooks/useTutorial";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { nativeManager } from '@/lib/nativeInit';
import { useLeaderboardNotifications } from '@/hooks/useLeaderboardNotifications';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AUTH_PENDING_PROFILE_SETUP_KEY } from '@/lib/authFlags';

const OnboardingDialog = lazy(() =>
  import("@/components/OnboardingDialog").then((m) => ({ default: m.OnboardingDialog }))
);
const ProfileSetupDialog = lazy(() =>
  import("@/components/ProfileSetupDialog").then((m) => ({ default: m.ProfileSetupDialog }))
);
const InteractiveTutorial = lazy(() =>
  import("@/components/InteractiveTutorial").then((m) => ({ default: m.InteractiveTutorial }))
);

const Index = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { 
    needsOnboarding, 
    needsProfileSetup,
    loading, 
    completeOnboarding,
    completeProfileSetup,
    recheckOnboarding
  } = useOnboarding();
  const {
    shouldShowTutorial,
    tutorialSteps,
    completeTutorial,
    skipTutorial,
  } = useTutorial();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [nativeStatus, setNativeStatus] = useState<boolean | null>(null);

  // Activer les notifications de dépassement au classement
  useLeaderboardNotifications();

  // Cleanup localStorage flags after successful landing
  useEffect(() => {
    const profileCreated = localStorage.getItem('profileCreatedSuccessfully');
    if (profileCreated === 'true') {
      const timer = setTimeout(() => {
        localStorage.removeItem('profileCreatedSuccessfully');
        localStorage.removeItem('profileCreatedAt');
        console.log('🧹 [Index] Cleaned up profile creation flags');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, []);


  useEffect(() => {
    const checkNativeStatus = async () => {
      const isNative = await nativeManager.ensureNativeStatus();
      setNativeStatus(isNative);
      console.log('🏠 Index - Statut natif confirmé:', isNative);
    };
    
    checkNativeStatus();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-3 bg-background px-6">
        <Loader2 className="h-9 w-9 animate-spin text-primary" aria-hidden />
        <p className="text-sm text-muted-foreground text-center">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <>
      {/* Calque de hauteur : doit laisser passer les clics vers la carte (PersistentHomeMap en dessous). */}
      <div className="pointer-events-none h-full min-h-0 w-full select-none" aria-hidden />

      {/* Onboarding pour les nouveaux utilisateurs */}
      <Suspense fallback={null}>
        <OnboardingDialog 
          isOpen={needsOnboarding} 
          onComplete={completeOnboarding} 
        />
      </Suspense>
      
      {/* Setup de profil pour les utilisateurs existants avec profil incomplet */}
      {needsProfileSetup && user && !localStorage.getItem('profileCreatedSuccessfully') && (
        <Suspense fallback={null}>
          <ProfileSetupDialog
            open={needsProfileSetup}
            onOpenChange={() => {}} // Empêche la fermeture manuelle
            userId={user.id}
            email={user.email || ''}
            onRequestSignIn={async () => {
              try {
                sessionStorage.removeItem(AUTH_PENDING_PROFILE_SETUP_KEY);
              } catch {
                /* ignore */
              }
              try {
                await supabase.auth.signOut({ scope: 'global' });
              } catch (e) {
                console.error('[Index] signOut (retour connexion):', e);
              }
              navigate('/auth', { replace: true });
            }}
            onComplete={() => {
              completeProfileSetup();
              recheckOnboarding();
            }}
          />
        </Suspense>
      )}
      
      

      {/* Tutoriel interactif pour nouveaux utilisateurs */}
      {shouldShowTutorial && !needsOnboarding && !needsProfileSetup && (
        <Suspense fallback={null}>
          <InteractiveTutorial 
            steps={tutorialSteps}
            onComplete={completeTutorial}
            onSkip={skipTutorial}
          />
        </Suspense>
      )}
    </>
  );
};

export default Index;
