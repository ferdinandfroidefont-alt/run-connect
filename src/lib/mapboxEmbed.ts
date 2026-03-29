import mapboxgl from "mapbox-gl";
import { getMapboxAccessToken, MAPBOX_NAVIGATION_DAY_STYLE } from "@/lib/mapboxConfig";
import type { MapCoord } from "@/lib/geoUtils";

let accessTokenSet = false;

function ensureMapboxToken(): string {
  const t = getMapboxAccessToken();
  if (!t) throw new Error("VITE_MAPBOX_ACCESS_TOKEN manquant");
  if (!accessTokenSet) {
    mapboxgl.accessToken = t;
    accessTokenSet = true;
  }
  return t;
}

/** lat/lng depuis coordonnées écran (clientX/Y), pour appui long hors événement carte. */
export function clientXYToMapCoord(map: mapboxgl.Map, clientX: number, clientY: number): MapCoord | null {
  const canvas = map.getCanvasContainer();
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  if (x < 0 || x > rect.width || y < 0 || y > rect.height) return null;
  const ll = map.unproject([x, y]);
  return { lng: ll.lng, lat: ll.lat };
}

/** Carte embarquée (prévisualisations, dialogs) — style navigation jour par défaut. */
export function createEmbeddedMapboxMap(
  container: HTMLElement,
  options: { interactive?: boolean; center?: MapCoord; zoom?: number; style?: string } = {},
): mapboxgl.Map {
  ensureMapboxToken();
  const c = options.center ?? { lat: 48.8566, lng: 2.3522 };
  return new mapboxgl.Map({
    container,
    style: options.style ?? MAPBOX_NAVIGATION_DAY_STYLE,
    center: [c.lng, c.lat],
    zoom: options.zoom ?? 12,
    interactive: options.interactive ?? false,
    attributionControl: false,
    dragRotate: false,
    pitchWithRotate: false,
  });
}

export function fitMapToCoords(map: mapboxgl.Map, coords: MapCoord[], padding = 16) {
  if (coords.length === 0) return;
  const first = coords[0]!;
  const bounds = new mapboxgl.LngLatBounds([first.lng, first.lat], [first.lng, first.lat]);
  for (let i = 1; i < coords.length; i++) {
    const p = coords[i]!;
    bounds.extend([p.lng, p.lat]);
  }
  map.fitBounds(bounds, { padding, duration: 0, maxZoom: 16 });
}

/** Ligne GeoJSON — crée/met à jour source + couche. */
export function setOrUpdateLineLayer(
  map: mapboxgl.Map,
  sourceId: string,
  layerId: string,
  coords: MapCoord[],
  paint: { color?: string; width?: number } = {},
) {
  const color = paint.color ?? "#2563eb";
  const width = paint.width ?? 4;
  const geojson: GeoJSON.Feature<GeoJSON.LineString> = {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: coords.map((c) => [c.lng, c.lat]),
    },
  };

  const apply = () => {
    const src = map.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined;
    if (src) {
      src.setData(geojson);
      return;
    }
    map.addSource(sourceId, { type: "geojson", data: geojson });
    map.addLayer({
      id: layerId,
      type: "line",
      source: sourceId,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": color, "line-width": width, "line-opacity": 0.92 },
    });
  };

  if (map.isStyleLoaded()) apply();
  else map.once("load", apply);
}

export function removeLineLayer(map: mapboxgl.Map, sourceId: string, layerId: string) {
  try {
    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);
  } catch {
    /* ignore */
  }
}
