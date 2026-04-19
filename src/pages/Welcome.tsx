import { Navigate } from "react-router-dom";
import { WelcomePrivacyScreen } from "@/components/arrival/WelcomePrivacyScreen";
import { useAuth } from "@/hooks/useAuth";
import { hasCompletedOnboarding, hasCompletedPrivacyGate } from "@/lib/arrivalFlowStorage";
import { Loader2 } from "lucide-react";

/**
 * Écran A — confidentialité (avant authentification).
 */
const Welcome = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center bg-background px-6"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 1.5rem)" }}
      >
        <Loader2 className="mb-4 h-9 w-9 animate-spin text-primary" />
        <p className="text-center text-sm text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  if (user?.id) {
    if (!hasCompletedOnboarding(user.id)) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/" replace />;
  }

  if (hasCompletedPrivacyGate()) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="fixed inset-0 overflow-y-auto bg-background">
      <WelcomePrivacyScreen />
    </div>
  );
};

export default Welcome;
