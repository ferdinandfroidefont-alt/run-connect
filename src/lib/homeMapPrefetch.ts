export type PrefetchedHomeMapPosition = {
  lat: number;
  lng: number;
  ts: number;
};

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
        timeout: 12_000,
        maximumAge: 600_000,
      });
      positionPrefetched = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        ts: Date.now(),
      };
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return;
    }

    await new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          positionPrefetched = {
            lat: p.coords.latitude,
            lng: p.coords.longitude,
            ts: Date.now(),
          };
          resolve();
        },
        () => resolve(),
        { enableHighAccuracy: false, timeout: 12_000, maximumAge: 300_000 },
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

const GEO_WAIT_STEP_MS = 45;

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
