export type MapboxGL = typeof import("mapbox-gl").default;

let mapboxPromise: Promise<MapboxGL> | null = null;

/**
 * Charge mapbox-gl + CSS une seule fois au premier usage (évite ~1.7MB sur le chemin critique).
 */
export function loadMapboxGl(): Promise<MapboxGL> {
  if (!mapboxPromise) {
    mapboxPromise = (async () => {
      await import("mapbox-gl/dist/mapbox-gl.css");
      const mod = await import("mapbox-gl");
      return mod.default;
    })();
  }
  return mapboxPromise;
}
