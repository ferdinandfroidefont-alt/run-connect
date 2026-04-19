/**
 * Persistance du tunnel d’arrivée (confidentialité pré-auth, onboarding post-login).
 * Stockage local uniquement — pas de PII hors userId Supabase déjà connu.
 */

export const ARRIVAL_PRIVACY_GATE_KEY = "runconnect-arrival-privacy-gate-v1";

/** Par utilisateur : onboarding produit terminé. */
export function onboardingCompletedKey(userId: string): string {
  return `runconnect-arrival-onboarding-done-v1:${userId}`;
}

export function onboardingSawPremiumKey(userId: string): string {
  return `runconnect-arrival-saw-premium-v1:${userId}`;
}

/** Snapshot des réponses permissions (tunnel + réutilisable par l’app). */
export function onboardingPermissionsKey(userId: string): string {
  return `runconnect-arrival-permissions-v1:${userId}`;
}

export type ArrivalPermissionOutcome = "granted" | "denied" | "skipped" | "unavailable";

export interface ArrivalPermissionsSnapshot {
  location: ArrivalPermissionOutcome;
  notifications: ArrivalPermissionOutcome;
  updatedAt: number;
}

export function hasCompletedPrivacyGate(): boolean {
  try {
    return localStorage.getItem(ARRIVAL_PRIVACY_GATE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markPrivacyGateCompleted(): void {
  try {
    localStorage.setItem(ARRIVAL_PRIVACY_GATE_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function hasCompletedOnboarding(userId: string | undefined): boolean {
  if (!userId) return true;
  try {
    return localStorage.getItem(onboardingCompletedKey(userId)) === "1";
  } catch {
    return true;
  }
}

export function markOnboardingCompleted(userId: string): void {
  try {
    localStorage.setItem(onboardingCompletedKey(userId), "1");
  } catch {
    /* ignore */
  }
}

export function hasSawPremiumScreen(userId: string | undefined): boolean {
  if (!userId) return false;
  try {
    return localStorage.getItem(onboardingSawPremiumKey(userId)) === "1";
  } catch {
    return false;
  }
}

export function markPremiumScreenSeen(userId: string): void {
  try {
    localStorage.setItem(onboardingSawPremiumKey(userId), "1");
  } catch {
    /* ignore */
  }
}

export function readPermissionsSnapshot(userId: string): ArrivalPermissionsSnapshot | null {
  try {
    const raw = localStorage.getItem(onboardingPermissionsKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ArrivalPermissionsSnapshot;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writePermissionsSnapshot(userId: string, partial: Partial<ArrivalPermissionsSnapshot>): void {
  try {
    const prev = readPermissionsSnapshot(userId) ?? {
      location: "unavailable" as const,
      notifications: "unavailable" as const,
      updatedAt: Date.now(),
    };
    const next: ArrivalPermissionsSnapshot = {
      ...prev,
      ...partial,
      updatedAt: Date.now(),
    };
    localStorage.setItem(onboardingPermissionsKey(userId), JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
