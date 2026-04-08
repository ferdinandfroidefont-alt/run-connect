export type MapboxGL = typeof import("mapbox-gl").default;

let mapboxPromise: Promise<MapboxGL> | null = null;

/**
 * Charge mapbox-gl + CSS une seule fois au premier usage (évite ~1.7MB sur le chemin critique).
 */
export function loadMapboxGl(): Promise<MapboxGL> {
  if (!mapboxPromise) {
    mapboxPromise = (async () => {
      // Sur certains WebView mobiles, le chunk CSS dynamique peut échouer.
      // On n'empêche pas le chargement JS de Mapbox dans ce cas.
      try {
        await import("mapbox-gl/dist/mapbox-gl.css");
      } catch (error) {
        console.warn("[mapboxLazy] CSS mapbox-gl non chargee", error);
      }

      const mod = await import("mapbox-gl");
      return mod.default;
    })();

    // Evite de garder une promesse rejettee en cache (permet un retry ulterieur).
    mapboxPromise.catch(() => {
      mapboxPromise = null;
    });
  }
  return mapboxPromise;
}
