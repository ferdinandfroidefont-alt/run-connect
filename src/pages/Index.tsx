import { lazy, Suspense } from "react";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useTutorial } from "@/hooks/useTutorial";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { RoutePageFallback } from '@/components/RoutePageFallback';
import { nativeManager } from '@/lib/nativeInit';
import { useLeaderboardNotifications } from '@/hooks/useLeaderboardNotifications';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

  // Activer les notifications de dépassement au classement
  useLeaderboardNotifications();

  // Cleanup localStorage flags after successful landing
  useEffect(() => {
    const profileCreated = localStorage.getItem('profileCreatedSuccessfully');
    if (profileCreated === 'true') {
      const timer = setTimeout(() => {
        localStorage.removeItem('profileCreatedSuccessfully');
        localStorage.removeItem('profileCreatedAt');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    void nativeManager.ensureNativeStatus();
  }, []);

  if (loading) {
    return (
      <div className="pointer-events-auto flex min-h-0 flex-1 flex-col bg-background">
        <RoutePageFallback variant="index" />
      </div>
    );
  }

  return (
    <div className="pointer-events-none flex min-h-0 w-full flex-1 flex-col">
      {/* Calque plein espace : un seul enfant flux pour un cadrage flex correct ; clics vers la carte. */}
      <div className="min-h-0 flex-1 select-none" aria-hidden />

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
    </div>
  );
};

export default Index;
