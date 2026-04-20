import { useAuth } from "@/hooks/useAuth";
import { useAppPreview } from "@/contexts/AppPreviewContext";

/**
 * Abonnement effectif pour l’UI : en mode aperçu admin, reflète le toggle Premium de l’identité fictive.
 */
export function useEffectiveSubscriptionInfo() {
  const { subscriptionInfo } = useAuth();
  const { isPreviewMode, previewIdentity } = useAppPreview();

  if (isPreviewMode && previewIdentity) {
    return {
      subscribed: previewIdentity.isPremium,
      subscription_tier: previewIdentity.isPremium ? "premium" : null,
      subscription_end: null as string | null,
    };
  }
  return subscriptionInfo;
}
