import type { MapCoord } from "@/lib/geoUtils";
import { getMapboxAccessToken } from "@/lib/mapboxConfig";

export type GeocodeDetail = MapCoord & { placeName: string };

/** Résultat au format attendu par LocationStep (compat ancienne API Google). */
export type GeocodeSearchRow = {
  formatted_address: string;
  geometry: { location: { lat: number; lng: number } };
};

export async function geocodeForwardMapbox(query: string): Promise<MapCoord | null> {
  const d = await geocodeForwardDetail(query);
  return d ? { lat: d.lat, lng: d.lng } : null;
}

export async function geocodeForwardDetail(query: string): Promise<GeocodeDetail | null> {
  const token = getMapboxAccessToken();
  if (!token || !query.trim()) return null;
  const q = encodeURIComponent(query.trim());
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${q}.json?country=FR&limit=1&language=fr&access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as {
    features?: {
      center?: [number, number];
      place_name?: string;
      text?: string;
    }[];
  };
  const f = data.features?.[0];
  const c = f?.center;
  if (!c) return null;
  const placeName = f.place_name || f.text || query.trim();
  return { lng: c[0]!, lat: c[1]!, placeName };
}

/** Plusieurs résultats pour l’autocomplétion de lieu (LocationStep). */
export async function geocodeSearchMapbox(query: string, limit = 5): Promise<GeocodeSearchRow[]> {
  const token = getMapboxAccessToken();
  if (!token || !query.trim()) return [];
  const q = encodeURIComponent(query.trim());
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${q}.json?country=FR&limit=${limit}&language=fr&access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = (await res.json()) as {
    features?: {
      place_name?: string;
      text?: string;
      center?: [number, number];
    }[];
  };
  const rows: GeocodeSearchRow[] = [];
  for (const f of data.features ?? []) {
    const c = f.center;
    if (!c) continue;
    rows.push({
      formatted_address: f.place_name || f.text || "",
      geometry: { location: { lat: c[1]!, lng: c[0]! } },
    });
  }
  return rows;
}

export async function reverseGeocodeMapbox(lat: number, lng: number): Promise<string | null> {
  const token = getMapboxAccessToken();
  if (!token) return null;
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?language=fr&limit=1&access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as { features?: { place_name?: string }[] };
  return data.features?.[0]?.place_name ?? null;
}
