import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { SessionExperienceFeedbackDialog } from "@/components/SessionExperienceFeedbackDialog";
import { useSessionExperienceFeedbackPrompt } from "@/hooks/useSessionExperienceFeedbackPrompt";

/**
 * File d’attente globale : après une séance passée, demande un retour rapide aux participants.
 * Ne s’affiche qu’avec consentement RGPD chargé.
 */
export function SessionExperienceFeedbackHost() {
  const { user } = useAuth();
  const { userProfile, loading: profileLoading } = useUserProfile();
  const location = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);

  const consentOk =
    !!userProfile?.rgpd_accepted &&
    !!userProfile?.security_rules_accepted;

  const enabled =
    !!user?.id &&
    !profileLoading &&
    consentOk &&
    !location.pathname.startsWith("/auth");

  const { pending, setPending, afterSubmit } = useSessionExperienceFeedbackPrompt(enabled, user?.id);

  useEffect(() => {
    if (pending) setDialogOpen(true);
  }, [pending]);

  const dismiss = () => {
    if (pending) {
      try {
        localStorage.setItem(`session_experience_feedback_skipped_${pending.sessionId}`, "1");
      } catch {
        /* ignore */
      }
    }
    setDialogOpen(false);
    setPending(null);
  };

  const handleSubmitted = () => {
    setDialogOpen(false);
    afterSubmit();
  };

  return (
    <SessionExperienceFeedbackDialog
      open={dialogOpen && !!pending}
      session={pending}
      onDismiss={dismiss}
      onSubmitted={handleSubmitted}
    />
  );
}
