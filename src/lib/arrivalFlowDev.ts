import {
  ARRIVAL_PRIVACY_GATE_KEY,
  onboardingCompletedKey,
  onboardingPermissionsKey,
  onboardingSawPremiumKey,
} from "@/lib/arrivalFlowStorage";

/**
 * Réinitialise le tunnel d’arrivée (développement / tests internes).
 * À appeler depuis la console : `window.__RC_RESET_ARRIVAL__()` ou depuis un bouton debug.
 */
export function resetArrivalFlowForDev(userId?: string | null): void {
  if (!import.meta.env.DEV) return;
  try {
    localStorage.removeItem(ARRIVAL_PRIVACY_GATE_KEY);
    if (userId) {
      localStorage.removeItem(onboardingCompletedKey(userId));
      localStorage.removeItem(onboardingSawPremiumKey(userId));
      localStorage.removeItem(onboardingPermissionsKey(userId));
    } else {
      const keys = Object.keys(localStorage);
      for (const k of keys) {
        if (
          k.startsWith("runconnect-arrival-onboarding-done-v1:") ||
          k.startsWith("runconnect-arrival-saw-premium-v1:") ||
          k.startsWith("runconnect-arrival-permissions-v1:")
        ) {
          localStorage.removeItem(k);
        }
      }
    }
  } catch {
    /* ignore */
  }
}

export function installArrivalFlowDevGlobal(): void {
  if (!import.meta.env.DEV || typeof window === "undefined") return;
  (window as Window & { __RC_RESET_ARRIVAL__?: (userId?: string | null) => void }).__RC_RESET_ARRIVAL__ =
    resetArrivalFlowForDev;
}
