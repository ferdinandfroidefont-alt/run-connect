import { InteractiveMap } from "@/components/InteractiveMap";
import { OnboardingDialog } from "@/components/OnboardingDialog";
import { WelcomeVideoDialog } from "@/components/WelcomeVideoDialog";
import { ProfileSetupDialog } from "@/components/ProfileSetupDialog";
import { NativeTestButton } from "@/components/NativeTestButton";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useAuth } from "@/hooks/useAuth";
import { useSearchParams } from "react-router-dom";

const Index = () => {
  const { user } = useAuth();
  const { 
    needsOnboarding, 
    needsProfileSetup,
    needsWelcomeVideo, 
    loading, 
    completeOnboarding,
    completeProfileSetup,
    markVideoAsSeen 
  } = useOnboarding();
  const [searchParams] = useSearchParams();

  // Extract map parameters from URL
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const zoom = searchParams.get('zoom');
  const sessionId = searchParams.get('sessionId');

  const handleVideoComplete = () => {
    markVideoAsSeen();
  };

  const handleVideoSkip = () => {
    markVideoAsSeen();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <InteractiveMap 
        initialLat={lat ? parseFloat(lat) : undefined}
        initialLng={lng ? parseFloat(lng) : undefined}
        initialZoom={zoom ? parseInt(zoom) : undefined}
        highlightSessionId={sessionId || undefined}
      />
      
      {/* Tests natifs Android (affiché seulement si pertinent) */}
      <div className="fixed top-4 left-4 z-50">
        <NativeTestButton />
      </div>
      
      {/* Onboarding pour les nouveaux utilisateurs */}
      <OnboardingDialog 
        isOpen={needsOnboarding} 
        onComplete={completeOnboarding} 
      />
      
      {/* Setup de profil pour les utilisateurs existants avec profil incomplet */}
      {needsProfileSetup && user && (
        <ProfileSetupDialog
          open={needsProfileSetup}
          onOpenChange={() => {}} // Empêche la fermeture manuelle
          userId={user.id}
          email={user.email || ''}
          onComplete={completeProfileSetup}
        />
      )}
      
      {/* Vidéo de bienvenue pour les nouveaux utilisateurs */}
      <WelcomeVideoDialog
        open={needsWelcomeVideo && !needsOnboarding && !needsProfileSetup}
        onClose={handleVideoSkip}
        onComplete={handleVideoComplete}
      />
    </>
  );
};

export default Index;
