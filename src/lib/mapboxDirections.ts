import type { MapCoord } from "@/lib/geoUtils";
import { distanceMeters } from "@/lib/geoUtils";
import { getMapboxAccessToken } from "@/lib/mapboxConfig";

type DirectionsProfile = "walking" | "cycling" | "driving";

const DIRECTIONS_TIMEOUT_MS = 60_000;

function pathLengthMetersQuick(path: MapCoord[]): number {
  let d = 0;
  for (let i = 1; i < path.length; i++) d += distanceMeters(path[i - 1]!, path[i]!);
  return d;
}

/**
 * Itinéraire Mapbox Directions (segment par segment). Paramètres adaptés à un bon accrochage au réseau.
 */
export async function fetchMapboxDirectionsPath(
  points: MapCoord[],
  profile: DirectionsProfile = "walking",
): Promise<MapCoord[] | null> {
  if (points.length < 2) return null;
  const token = getMapboxAccessToken();
  if (!token) return null;

  const coordStr = points.map((p) => `${p.lng},${p.lat}`).join(";");
  const radiuses = points.map(() => "unlimited").join(";");
  const params = new URLSearchParams({
    alternatives: "false",
    geometries: "geojson",
    overview: "full",
    steps: "false",
    continue_straight: "false",
    access_token: token,
  });
  params.set("radiuses", radiuses);

  const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${encodeURIComponent(coordStr)}?${params.toString()}`;
  const controller = new AbortController();
  const to = window.setTimeout(() => controller.abort(), DIRECTIONS_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      console.warn("[Mapbox Directions]", profile, res.status);
      return null;
    }
    const data = (await res.json()) as {
      routes?: { geometry?: { coordinates?: [number, number][] } }[];
    };
    const coords = data.routes?.[0]?.geometry?.coordinates;
    if (!coords?.length) return null;
    return coords.map(([lng, lat]) => ({ lat, lng }));
  } catch (e) {
    console.warn("[Mapbox Directions] erreur", profile, e);
    return null;
  } finally {
    window.clearTimeout(to);
  }
}

/**
 * Un segment A→B : essaie marche (sentiers), puis vélo et route (même logique pour longues distances).
 * Garde la meilleure géométrie « suivie » vs ligne droite ; sinon retourne la dernière réponse valide.
 */
export async function fetchRoutedPathBetweenWaypoints(start: MapCoord, end: MapCoord): Promise<MapCoord[] | null> {
  const straight = Math.max(1, distanceMeters(start, end));
  const profiles: DirectionsProfile[] = ["walking", "cycling", "driving"];
  let fallback: MapCoord[] | null = null;

  for (const profile of profiles) {
    const path = await fetchMapboxDirectionsPath([start, end], profile);
    if (!path || path.length < 2) continue;
    if (!fallback) fallback = path;
    const routed = pathLengthMetersQuick(path);
    if (routed >= straight * 0.9 || profile === "driving") {
      return path;
    }
  }

  return fallback;
}
