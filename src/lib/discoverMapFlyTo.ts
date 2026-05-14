/** Cible envoyée depuis l’écran recherche Découvrir → carte embarquée (sessionStorage survive au remmount). */

export type DiscoverMapFlyToPayload = {
  lat: number;
  lng: number;
  /** Zoom après sélection lieu ( défaut dans DiscoverMapCard ). */
  zoom?: number;
};

const KEY = "rc.discoverMapFlyTo.v1";

export function stashDiscoverMapFlyTo(payload: DiscoverMapFlyToPayload): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* stockage désactivé / quota */
  }
}

export function consumeDiscoverMapFlyTo(): DiscoverMapFlyToPayload | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    const p = JSON.parse(raw) as unknown;
    if (!p || typeof p !== "object") return null;
    const lat = Number((p as DiscoverMapFlyToPayload).lat);
    const lng = Number((p as DiscoverMapFlyToPayload).lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    const zoomRaw = Number((p as DiscoverMapFlyToPayload).zoom);
    const zoom = Number.isFinite(zoomRaw) ? zoomRaw : undefined;
    return zoom != null ? { lat, lng, zoom } : { lat, lng };
  } catch {
    return null;
  }
}
