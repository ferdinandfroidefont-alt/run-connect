import { Navigate } from "react-router-dom";
import { ArrivalOnboardingFlow } from "@/components/arrival/ArrivalOnboardingFlow";
import { useAuth } from "@/hooks/useAuth";
import { ARRIVAL_ONBOARDING_ENABLED, hasCompletedOnboarding } from "@/lib/arrivalFlowStorage";
import { Loader2 } from "lucide-react";

/**
 * Tunnel d’onboarding post-login (slides, permissions, intégrations, premium soft).
 */
const Onboarding = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center bg-background px-6"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 1.5rem)" }}
      >
        <Loader2 className="mb-4 h-9 w-9 animate-spin text-primary" />
        <p className="text-center text-sm text-muted-foreground">Préparation de votre parcours…</p>
      </div>
    );
  }

  if (!user?.id) {
    return <Navigate to="/auth" replace />;
  }

  if (!ARRIVAL_ONBOARDING_ENABLED) {
    return <Navigate to="/" replace />;
  }

  if (hasCompletedOnboarding(user.id)) {
    return <Navigate to="/" replace />;
  }

  return <ArrivalOnboardingFlow />;
};

export default Onboarding;
