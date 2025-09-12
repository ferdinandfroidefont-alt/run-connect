import { InteractiveMap } from "@/components/InteractiveMap";
import { OnboardingDialog } from "@/components/OnboardingDialog";
import { WelcomeVideoDialog } from "@/components/WelcomeVideoDialog";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useSearchParams } from "react-router-dom";

const Index = () => {
  const { 
    needsOnboarding, 
    needsWelcomeVideo, 
    loading, 
    completeOnboarding, 
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
      
      {/* Onboarding pour les nouveaux utilisateurs */}
      <OnboardingDialog 
        isOpen={needsOnboarding} 
        onComplete={completeOnboarding} 
      />
      
      {/* Vidéo de bienvenue pour les nouveaux utilisateurs */}
      <WelcomeVideoDialog
        open={needsWelcomeVideo && !needsOnboarding}
        onClose={handleVideoSkip}
        onComplete={handleVideoComplete}
      />
    </>
  );
};

export default Index;
