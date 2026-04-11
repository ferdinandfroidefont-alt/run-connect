export const VISUAL_MODE_STORAGE_KEY = 'runconnect-visual';

/** Fond barre d’état / chrome : aligné sur l’identité Deep Blue (#0B1F3A). */
export const DEEP_BLUE_CHROME_HEX = '#0B1F3A';

export type VisualModeId = 'default' | 'deepBlue';

const DEEP_BLUE_DATASET = 'deep-blue';

export function getStoredVisualMode(): VisualModeId {
  try {
    const v = localStorage.getItem(VISUAL_MODE_STORAGE_KEY);
    return v === 'deepBlue' ? 'deepBlue' : 'default';
  } catch {
    return 'default';
  }
}

export function isDeepBlueVisualFromDom(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.dataset.visual === DEEP_BLUE_DATASET;
}

export function applyVisualModeToDocument(mode: VisualModeId) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (mode === 'deepBlue') {
    root.dataset.visual = DEEP_BLUE_DATASET;
  } else {
    delete root.dataset.visual;
  }
}

export function setVisualModeAndPersist(mode: VisualModeId) {
  try {
    if (mode === 'deepBlue') {
      localStorage.setItem(VISUAL_MODE_STORAGE_KEY, 'deepBlue');
    } else {
      localStorage.removeItem(VISUAL_MODE_STORAGE_KEY);
    }
  } catch {
    /* private mode / quota */
  }
  applyVisualModeToDocument(mode);
  try {
    window.dispatchEvent(new Event('runconnect-visual-mode'));
  } catch {
    /* ignore */
  }
}

export function initVisualModeFromStorage() {
  applyVisualModeToDocument(getStoredVisualMode());
}

/** Même onglet + autres onglets (storage). */
export function subscribeVisualMode(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === VISUAL_MODE_STORAGE_KEY) onChange();
  };
  const onLocal = () => onChange();
  window.addEventListener('storage', onStorage);
  window.addEventListener('runconnect-visual-mode', onLocal);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('runconnect-visual-mode', onLocal);
  };
}
