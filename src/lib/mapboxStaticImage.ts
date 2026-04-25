import { getMapboxAccessToken } from '@/lib/mapboxConfig';

export type MapboxStaticPoint = { lat: number; lng: number };

const STYLE_LIGHT = 'mapbox/light-v11';

/**
 * Style coloré rues/parcs/eau utilisé pour le partage de séance.
 * Identique à la maquette produit (gris clair + parcs verts + rivières bleues).
 * On force ce style indépendamment des préférences utilisateur pour garantir
 * un rendu cohérent et photogénique de la carte de partage.
 */
const SESSION_SHARE_MAP_STYLE = 'mapbox/streets-v12';

/**
 * Image statique Mapbox réelle, centrée sur la localisation de la séance.
 * Le pin est rendu en React par-dessus (style "rc-session-pin" — voir SessionShareArtboard).
 */
export function buildSessionStaticMapUrl(options: {
  routePath: MapboxStaticPoint[];
  pin: MapboxStaticPoint;
  width: number;
  height: number;
  padding?: number;
}): string | null {
  const token = getMapboxAccessToken();
  if (!token) return null;

  const { pin, width, height } = options;
  // Zoom 13 → on voit le quartier autour du pin (rues, parcs, points de repère)
  // tout en gardant les libellés (parcs, rivières) lisibles, comme sur la maquette.
  const zoom = 13;
  const path = `/styles/v1/${SESSION_SHARE_MAP_STYLE}/static/${pin.lng},${pin.lat},${zoom},0,0/${width}x${height}`;
  const params = new URLSearchParams({ access_token: token });

  return `https://api.mapbox.com${path}?${params.toString()}`;
}

/** Centre approximatif (lat/lng) pour une carte de fond très légère (partage profil). */
const PROFILE_MAP_CENTER_BY_COUNTRY: Record<string, { lat: number; lng: number }> = {
  FR: { lat: 46.5, lng: 2.5 },
  BE: { lat: 50.5, lng: 4.5 },
  CH: { lat: 46.8, lng: 8.2 },
  CA: { lat: 56.1, lng: -96.0 },
  LU: { lat: 49.8, lng: 6.1 },
  MA: { lat: 31.8, lng: -7.1 },
  TN: { lat: 34.0, lng: 9.0 },
  DZ: { lat: 28.0, lng: 3.0 },
  SN: { lat: 14.5, lng: -14.5 },
  CI: { lat: 7.5, lng: -5.5 },
  ES: { lat: 40.4, lng: -3.7 },
  PT: { lat: 39.4, lng: -8.2 },
  DE: { lat: 51.2, lng: 10.4 },
  IT: { lat: 42.8, lng: 12.6 },
  GB: { lat: 54.0, lng: -2.5 },
  US: { lat: 39.8, lng: -98.5 },
};

/**
 * Carte Mapbox light statique sans pin (fond discret pour carte de partage).
 */
export function buildProfileShareMapBackgroundUrl(options: {
  countryCode: string | null | undefined;
  width: number;
  height: number;
}): string | null {
  const token = getMapboxAccessToken();
  if (!token) return null;

  const code = (options.countryCode || 'FR').trim().toUpperCase();
  const c = PROFILE_MAP_CENTER_BY_COUNTRY[code] ?? PROFILE_MAP_CENTER_BY_COUNTRY.FR;
  const zoom = 10;
  const { width, height } = options;
  const path = `/styles/v1/${STYLE_LIGHT}/static/${c.lng},${c.lat},${zoom},0,0/${width}x${height}`;
  const params = new URLSearchParams({ access_token: token });
  return `https://api.mapbox.com${path}?${params.toString()}`;
}

export function normalizeRouteCoordinates(raw: unknown[] | undefined | null): MapboxStaticPoint[] {
  if (!raw?.length) return [];
  const out: MapboxStaticPoint[] = [];
  for (const coord of raw) {
    const c = coord as Record<string, unknown> | unknown[];
    if (c && typeof c === 'object' && !Array.isArray(c) && c.lat != null && c.lng != null) {
      const lat = Number(c.lat);
      const lng = Number(c.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) out.push({ lat, lng });
    } else if (Array.isArray(coord) && coord.length >= 2) {
      const a = Number(coord[0]);
      const b = Number(coord[1]);
      if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
      // GeoJSON LineString : [longitude, latitude] — la base peut exposer l’un ou l’autre ordre.
      if (Math.abs(a) > 90) {
        out.push({ lat: b, lng: a });
      } else if (Math.abs(b) > 90) {
        out.push({ lat: a, lng: b });
      } else if (a < b && b > 35 && b < 72 && Math.abs(a) < 25) {
        // GeoJSON [lng, lat] typique Europe occidentale — évite les faux positifs (ex. [10, 20] en lat/lng).
        out.push({ lat: b, lng: a });
      } else {
        out.push({ lat: a, lng: b });
      }
    }
  }
  return out;
}
