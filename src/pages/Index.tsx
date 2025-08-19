import { InteractiveMap } from "@/components/InteractiveMap";
import { OnboardingDialog } from "@/components/OnboardingDialog";
import { useOnboarding } from "@/hooks/useOnboarding";

const Index = () => {
  const { needsOnboarding, loading, completeOnboarding } = useOnboarding();

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
      <InteractiveMap />
      <OnboardingDialog 
        isOpen={needsOnboarding} 
        onComplete={completeOnboarding} 
      />
    </>
  );
};

export default Index;
