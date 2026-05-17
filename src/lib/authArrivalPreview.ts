import { hasCreatorSupportAccess } from "@/lib/creatorSupportAccess";

/** Query sur `/auth` pour parcourir l’inscription / profil sans créer de compte (réservé créateur). */
export const AUTH_ARRIVAL_PREVIEW_PARAM = "arrivalPreview";

/** Sous-étape du parcours arrivée (`?arrivalPreview=1&step=…`). */
export const AUTH_ARRIVAL_PREVIEW_STEP_PARAM = "step";

export type AuthArrivalPreviewStep = "signup" | "otp" | "profile";

export const ARRIVAL_PREVIEW_FAKE_USER_ID = "00000000-0000-4000-8000-000000000001";
export const ARRIVAL_PREVIEW_EMAIL = "nouveau.compte@exemple.runconnect";

export function isAuthArrivalPreviewUrl(
  searchParams: URLSearchParams,
  email: string | null | undefined,
  username: string | null | undefined
): boolean {
  const v = searchParams.get(AUTH_ARRIVAL_PREVIEW_PARAM);
  if (v !== "1" && v !== "true") return false;
  return hasCreatorSupportAccess(email, username);
}

export function getAuthArrivalPreviewStep(
  searchParams: URLSearchParams
): AuthArrivalPreviewStep | null {
  const raw = searchParams.get(AUTH_ARRIVAL_PREVIEW_STEP_PARAM)?.trim().toLowerCase();
  if (!raw) return null;
  if (raw === "profile" || raw === "profil" || raw === "nom") return "profile";
  if (raw === "otp" || raw === "code") return "otp";
  if (raw === "signup" || raw === "email" || raw === "inscription") return "signup";
  return null;
}

export function buildAuthArrivalPreviewHref(step?: AuthArrivalPreviewStep): string {
  const params = new URLSearchParams();
  params.set(AUTH_ARRIVAL_PREVIEW_PARAM, "1");
  if (step) params.set(AUTH_ARRIVAL_PREVIEW_STEP_PARAM, step);
  return `/auth?${params.toString()}`;
}
