import { InteractiveMap } from "@/components/InteractiveMap";
import { OnboardingDialog } from "@/components/OnboardingDialog";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useSearchParams } from "react-router-dom";

const Index = () => {
  const { needsOnboarding, loading, completeOnboarding } = useOnboarding();
  const [searchParams] = useSearchParams();

  // Extract map parameters from URL
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const zoom = searchParams.get('zoom');
  const sessionId = searchParams.get('sessionId');

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
      <OnboardingDialog 
        isOpen={needsOnboarding} 
        onComplete={completeOnboarding} 
      />
    </>
  );
};

export default Index;
