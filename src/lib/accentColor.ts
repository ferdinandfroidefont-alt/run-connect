export const ACCENT_STORAGE_KEY = "runconnect-accent";

export type AccentId = "default" | "marine";

export function getStoredAccent(): AccentId {
  try {
    const v = localStorage.getItem(ACCENT_STORAGE_KEY);
    return v === "marine" ? "marine" : "default";
  } catch {
    return "default";
  }
}

export function applyAccentToDocument(accent: AccentId) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (accent === "marine") {
    root.dataset.accent = "marine";
  } else {
    delete root.dataset.accent;
  }
}

export function setAccentAndPersist(accent: AccentId) {
  try {
    if (accent === "marine") {
      localStorage.setItem(ACCENT_STORAGE_KEY, "marine");
    } else {
      localStorage.removeItem(ACCENT_STORAGE_KEY);
    }
  } catch {
    /* private mode / quota */
  }
  applyAccentToDocument(accent);
}

export function initAccentFromStorage() {
  applyAccentToDocument(getStoredAccent());
}
