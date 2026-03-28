import { Loader } from '@googlemaps/js-api-loader';
import { supabase } from '@/integrations/supabase/client';
import { getKeyBody } from '@/lib/googleMapsKey';

export type PrefetchedHomeMapPosition = {
  lat: number;
  lng: number;
  ts: number;
};

let mapsPrefetchPromise: Promise<void> | null = null;
/** Vrai dès que le splash a lancé le prefetch — évite d’attendre inutilement sur l’écran carte. */
let geoPrefetchStarted = false;
/** Position résolue pendant le splash (lue une fois par InteractiveMap). */
let positionPrefetched: PrefetchedHomeMapPosition | null = null;

function startMapsScriptPrefetch(): void {
  if (mapsPrefetchPromise != null) return;
  if (typeof window !== 'undefined' && window.google?.maps) {
    mapsPrefetchPromise = Promise.resolve();
    return;
  }

  mapsPrefetchPromise = (async () => {
    try {
      const { data: apiKeyData, error: apiKeyError } = await supabase.functions.invoke('google-maps-proxy', {
        body: getKeyBody(),
      });
      if (apiKeyError) {
        console.warn('[homeMapPrefetch] clé Maps:', apiKeyError.message);
        return;
      }
      const googleMapsApiKey = apiKeyData?.apiKey as string | undefined;
      if (!googleMapsApiKey) {
        console.warn('[homeMapPrefetch] pas de clé API');
        return;
      }
      const loader = new Loader({
        apiKey: googleMapsApiKey,
        version: 'weekly',
        libraries: ['geometry', 'places'],
      });
      await loader.load();
    } catch (e) {
      console.warn('[homeMapPrefetch] échec chargement script Maps', e);
    }
  })();
}

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
 * À appeler dès l’écran de chargement : charge le JS Google Maps en parallèle du splash
 * et tente une position en cache si les permissions sont déjà là.
 */
export function primeHomeMapDuringSplash(): void {
  startMapsScriptPrefetch();
  if (!geoPrefetchStarted) {
    geoPrefetchStarted = true;
    void startGeolocationPrefetch();
  }
}

/** Promesse du chargement Maps (si le prefetch a été lancé). */
export function getMapsPrefetchPromise(): Promise<void> | null {
  return mapsPrefetchPromise;
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
