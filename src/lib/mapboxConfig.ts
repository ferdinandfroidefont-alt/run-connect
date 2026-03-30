/** Style de base — tuiles stables (par défaut pour éviter écran blanc / quotas style). */
export const MAPBOX_STREETS_STYLE = "mapbox://styles/mapbox/streets-v12";

/** Style premium navigation (jour) — réactiver quand la carte de base est OK. */
export const MAPBOX_NAVIGATION_DAY_STYLE = "mapbox://styles/mapbox/navigation-day-v1";

export const MAPBOX_STYLE_BY_UI_ID: Record<string, string> = {
  /** `streets-v12` en premier pour une intégration minimale fiable ; repasser `MAPBOX_NAVIGATION_DAY_STYLE` si besoin produit. */
  roadmap: MAPBOX_STREETS_STYLE,
  satellite: "mapbox://styles/mapbox/satellite-streets-v12",
  hybrid: "mapbox://styles/mapbox/satellite-streets-v12",
  terrain: "mapbox://styles/mapbox/outdoors-v12",
  dark: "mapbox://styles/mapbox/dark-v11",
  /** Bâtiments 3D et rendu type « Mapbox Standard » (GL JS 3.x). */
  standard3d: "mapbox://styles/mapbox/standard",
  /** Ancien thème custom Google — approx. clair */
  custom: "mapbox://styles/mapbox/light-v11",
};

export function getMapboxAccessToken(): string {
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string | undefined;
  if (!token?.trim()) {
    console.error("[Mapbox] VITE_MAPBOX_ACCESS_TOKEN manquant — ajoute-la dans .env");
    return "";
  }
  return token.trim();
}
