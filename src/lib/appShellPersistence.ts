/**
 * Indique que le shell React (router + thème) a déjà été montré au moins une fois sur cet appareil.
 * Persisté en localStorage : survit aux rechargements WebView et aux navigations `location.replace` après logout,
 * pour ne pas réafficher le splash global à chaque retour sur /auth.
 * Ne stocke aucune donnée personnelle.
 */
const LS_KEY = "runconnect_shell_boot_ok_v1";

export function getAppShellBootCompleted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(LS_KEY) === "1";
  } catch {
    return false;
  }
}

export function setAppShellBootCompleted(): void {
  try {
    localStorage.setItem(LS_KEY, "1");
  } catch {
    /* private mode / quota */
  }
}

/** Utile pour tests ou reset produit ; non utilisé au logout volontaire. */
export function clearAppShellBootCompleted(): void {
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    /* ignore */
  }
}
