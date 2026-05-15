import type { NavigateFunction } from "react-router-dom";

/**
 * Après exchangeCodeForSession / signIn*, `navigate("/")` dans la même continuation
 * async peut s'exécuter avant que React n'ait commit `useAuth.user`. Layout voit alors
 * encore `user === null` et renvoie vers `/auth` (flash). Un navigate au prochain
 * macrotask laisse le contexte Auth se mettre à jour.
 */
export function navigateAfterAuthCommit(
  navigate: NavigateFunction,
  to: string = "/",
  options?: { replace?: boolean }
): void {
  const replace = options?.replace ?? true;
  window.setTimeout(() => {
    navigate(to, { replace });
  }, 0);
}
