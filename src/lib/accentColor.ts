const ACCENT_LEGACY_KEY = "runconnect-accent";

/** Nettoie l’ancien réglage « bleu nuit » (retiré des paramètres). */
export function initAccentFromStorage() {
  try {
    localStorage.removeItem(ACCENT_LEGACY_KEY);
  } catch {
    /* private mode / quota */
  }
  if (typeof document === "undefined") return;
  delete document.documentElement.dataset.accent;
}
