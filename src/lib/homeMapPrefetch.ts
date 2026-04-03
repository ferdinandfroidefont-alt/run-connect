export type PrefetchedHomeMapPosition = {
  lat: number;
  lng: number;
  ts: number;
};

/** Âge max accepté pour un fix « instantané » depuis le cache OS (évite valeurs absurdes côté natif). */
export const HOME_MAP_GEO_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Prefetch mémoire (splash) : au-delà, on considère le point trop vieux pour un seul flux sans rafraîchir. */
export const HOME_HOT_PREFETCH_MAX_AGE_MS = 45_000;

const LAST_HOME_GEO_STORAGE_KEY = 'runconnect_last_home_geo_v1';

function isValidCoord(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

/**
 * Dernière position carte d’accueil connue (localStorage, appareil uniquement).
 * Permet un centre / marqueur immédiat avant tout appel géoloc.
 */
export function getPersistedHomeMapPosition(): PrefetchedHomeMapPosition | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LAST_HOME_GEO_STORAGE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as { lat?: unknown; lng?: unknown; ts?: unknown };
    const lat = Number(o.lat);
    const lng = Number(o.lng);
    const ts = Number(o.ts);
    if (!isValidCoord(lat, lng) || !Number.isFinite(ts)) return null;
    if (Date.now() - ts > HOME_MAP_GEO_CACHE_MAX_AGE_MS) return null;
    return { lat, lng, ts };
  } catch {
    return null;
  }
}

export function persistHomeMapPosition(p: { lat: number; lng: number }): void {
  if (typeof localStorage === 'undefined') return;
  if (!isValidCoord(p.lat, p.lng)) return;
  try {
    localStorage.setItem(
      LAST_HOME_GEO_STORAGE_KEY,
      JSON.stringify({ lat: p.lat, lng: p.lng, ts: Date.now() }),
    );
  } catch {
    /* quota / mode privé */
  }
}

/** Vrai dès que le splash a lancé le prefetch — évite d’attendre inutilement sur l’écran carte. */
let geoPrefetchStarted = false;
/** Position résolue pendant le splash (lue une fois par InteractiveMap). */
let positionPrefetched: PrefetchedHomeMapPosition | null = null;

/**
 * Géolocalisation « douce » pendant le splash : pas de demande de permission (silencieux si pas encore accordé).
 * Réutilise le cache OS / maximumAge pour les utilisateurs déjà autorisés.
 */
async function startGeolocationPrefetch(): Promise<void> {
  try {
    const { Capacitor } = await import('@capacitor/core');

    if (Capacitor.isNativePlatform()) {
      const { Geolocation } = await import('@capacitor/geolocation');
      const chk = await Geolocation.checkPermissions();
      if (chk.location !== 'granted') {
        return;
      }
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 5_000,
        maximumAge: HOME_MAP_GEO_CACHE_MAX_AGE_MS,
      });
      const row: PrefetchedHomeMapPosition = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        ts: Date.now(),
      };
      positionPrefetched = row;
      persistHomeMapPosition(row);
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return;
    }

    await new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          const row: PrefetchedHomeMapPosition = {
            lat: p.coords.latitude,
            lng: p.coords.longitude,
            ts: Date.now(),
          };
          positionPrefetched = row;
          persistHomeMapPosition(row);
          resolve();
        },
        () => resolve(),
        { enableHighAccuracy: false, timeout: 5_000, maximumAge: HOME_MAP_GEO_CACHE_MAX_AGE_MS },
      );
    });
  } catch {
    /* silencieux — la carte fera une vraie tentative plus tard */
  }
}

/**
 * À appeler dès l’écran de chargement : tente une position en cache si les permissions sont déjà là.
 * (Mapbox GL se charge avec l’app — pas de prefetch de script tiers.)
 */
export function primeHomeMapDuringSplash(): void {
  if (!geoPrefetchStarted) {
    geoPrefetchStarted = true;
    void startGeolocationPrefetch();
  }
}

/** Dès le chargement du bundle — avant React — pour maximiser le chevauchement avec le splash / le routeur. */
export function primeHomeMapAtAppEntry(): void {
  primeHomeMapDuringSplash();
}

/**
 * Si la géoloc du splash est déjà arrivée, la consomme tout de suite (sans attente).
 * Permet d’initialiser Mapbox immédiatement au bon centre sans bloquer sur une boucle d’attente.
 */
export function takePrefetchedHomeMapPositionIfReady(): PrefetchedHomeMapPosition | null {
  if (positionPrefetched == null) return null;
  const p = positionPrefetched;
  positionPrefetched = null;
  return p;
}

const GEO_WAIT_STEP_MS = 4;

/**
 * Attend que la géoloc du splash arrive (ou timeout) pour éviter la course splash → carte InteractiveMap.
 */
export async function waitForPrefetchedHomeMapPosition(maxWaitMs: number): Promise<PrefetchedHomeMapPosition | null> {
  if (!geoPrefetchStarted) {
    return null;
  }
  let waited = 0;
  while (waited <= maxWaitMs) {
    if (positionPrefetched != null) {
      const p = positionPrefetched;
      positionPrefetched = null;
      return p;
    }
    await new Promise<void>((r) => setTimeout(r, GEO_WAIT_STEP_MS));
    waited += GEO_WAIT_STEP_MS;
  }
  if (positionPrefetched != null) {
    const p = positionPrefetched;
    positionPrefetched = null;
    return p;
  }
  return null;
}
