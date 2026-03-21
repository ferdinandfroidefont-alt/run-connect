/** Clé localStorage : partage position activé depuis Mes séances pour cette séance */
export const liveShareStorageKey = (sessionId: string) => `rc-live-share:${sessionId}`;

export function getLiveShareOptIn(sessionId: string): boolean {
  try {
    return localStorage.getItem(liveShareStorageKey(sessionId)) === '1';
  } catch {
    return false;
  }
}

export function setLiveShareOptIn(sessionId: string, active: boolean) {
  try {
    if (active) localStorage.setItem(liveShareStorageKey(sessionId), '1');
    else localStorage.removeItem(liveShareStorageKey(sessionId));
  } catch {
    /* ignore */
  }
}
