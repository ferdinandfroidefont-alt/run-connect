/**
 * Accès aux outils internes « dashboard créateur / support ».
 * Données sensibles : usage conforme RGPD (minimisation, finalité support).
 */
export const CREATOR_SUPPORT_EMAIL = 'ferdinand.froidefont@gmail.com';
export const CREATOR_SUPPORT_USERNAME = 'ferdinand_stat_triathlon';

export function hasCreatorSupportAccess(
  email: string | undefined | null,
  username: string | undefined | null
): boolean {
  const e = email?.trim().toLowerCase();
  if (e && e === CREATOR_SUPPORT_EMAIL.toLowerCase()) return true;
  const u = username?.trim().toLowerCase();
  if (u && u === CREATOR_SUPPORT_USERNAME.toLowerCase()) return true;
  return false;
}
