import { encodePolyline } from '@/lib/polylineEncode';
import { getMapboxAccessToken } from '@/lib/mapboxConfig';

export type MapboxStaticPoint = { lat: number; lng: number };

const STYLE_LIGHT = 'mapbox/light-v11';

/** Bleu RunConnect (proche primary) */
const ROUTE_COLOR = '2563eb';
const PIN_COLOR = '2563eb';

function joinOverlays(parts: string[]): string {
  return parts.filter(Boolean).join(',');
}

/**
 * Image statique Mapbox (carte + éventuel tracé + pin).
 * Utilise le mode `auto` pour cadrer tracé + marqueur.
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

  const { routePath, pin, width, height } = options;
  const padding = options.padding ?? 64;

  const overlays: string[] = [];

  if (routePath.length >= 2) {
    const encoded = encodePolyline(routePath);
    if (encoded) {
      overlays.push(`path-5+${ROUTE_COLOR}-0.9(${encoded})`);
    }
  }

  overlays.push(`pin-l+${PIN_COLOR}(${pin.lng},${pin.lat})`);

  const overlay = joinOverlays(overlays);
  const path = `/styles/v1/${STYLE_LIGHT}/static/${overlay}/auto/${width}x${height}`;

  const params = new URLSearchParams({
    padding: String(padding),
    access_token: token,
  });

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
      const lat = Number(coord[0]);
      const lng = Number(coord[1]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) out.push({ lat, lng });
    }
  }
  return out;
}
