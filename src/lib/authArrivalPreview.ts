import { hasCreatorSupportAccess } from "@/lib/creatorSupportAccess";

/** Query sur `/auth` pour parcourir l’inscription / profil sans créer de compte (réservé créateur). */
export const AUTH_ARRIVAL_PREVIEW_PARAM = "arrivalPreview";

export function isAuthArrivalPreviewUrl(
  searchParams: URLSearchParams,
  email: string | null | undefined,
  username: string | null | undefined
): boolean {
  const v = searchParams.get(AUTH_ARRIVAL_PREVIEW_PARAM);
  if (v !== "1" && v !== "true") return false;
  return hasCreatorSupportAccess(email, username);
}
