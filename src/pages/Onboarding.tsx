import { Navigate } from "react-router-dom";
import { ArrivalOnboardingFlow } from "@/components/arrival/ArrivalOnboardingFlow";
import { useAuth } from "@/hooks/useAuth";
import { ARRIVAL_ONBOARDING_ENABLED, hasCompletedOnboarding } from "@/lib/arrivalFlowStorage";
import { RUCONNECT_ONBOARDING_ARRIVAL_BG_URL } from "@/lib/ruconnectSplashChrome";
import { Loader2 } from "lucide-react";

/**
 * Tunnel d’onboarding post-login (slides, permissions, intégrations, premium soft).
 */
const Onboarding = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        className="fixed inset-0 z-[130] overflow-hidden"
        style={{
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <img
          src={RUCONNECT_ONBOARDING_ARRIVAL_BG_URL}
          alt=""
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[center_30%]"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/25 to-black/15"
          aria-hidden
        />
        <div className="relative flex h-full flex-col items-center justify-center px-6">
          <Loader2 className="mb-4 h-9 w-9 animate-spin text-white" />
          <p className="text-center text-sm font-medium text-white/90 drop-shadow-sm">
            Préparation de votre parcours…
          </p>
        </div>
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
