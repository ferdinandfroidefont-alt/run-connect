import type { MapCoord } from "@/lib/geoUtils";
import { getMapboxAccessToken } from "@/lib/mapboxConfig";

type DirectionsProfile = "walking" | "cycling" | "driving";

/**
 * Itinéraire Mapbox Directions API : retourne une liste de points {lat,lng}.
 */
export async function fetchMapboxDirectionsPath(
  points: MapCoord[],
  profile: DirectionsProfile = "walking"
): Promise<MapCoord[] | null> {
  if (points.length < 2) return null;
  const token = getMapboxAccessToken();
  if (!token) return null;

  const coordStr = points.map((p) => `${p.lng},${p.lat}`).join(";");
  const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${encodeURIComponent(coordStr)}?alternatives=false&geometries=geojson&overview=full&steps=false&access_token=${encodeURIComponent(token)}`;

  const res = await fetch(url);
  if (!res.ok) {
    console.error("[Mapbox Directions]", res.status, await res.text());
    return null;
  }
  const data = (await res.json()) as {
    routes?: { geometry?: { coordinates?: [number, number][] } }[];
  };
  const coords = data.routes?.[0]?.geometry?.coordinates;
  if (!coords?.length) return null;
  return coords.map(([lng, lat]) => ({ lat, lng }));
}
