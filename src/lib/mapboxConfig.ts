/** Style premium navigation (jour) — demandé produit */
export const MAPBOX_NAVIGATION_DAY_STYLE = "mapbox://styles/mapbox/navigation-day-v1";

export const MAPBOX_STYLE_BY_UI_ID: Record<string, string> = {
  roadmap: MAPBOX_NAVIGATION_DAY_STYLE,
  satellite: "mapbox://styles/mapbox/satellite-streets-v12",
  hybrid: "mapbox://styles/mapbox/satellite-streets-v12",
  terrain: "mapbox://styles/mapbox/outdoors-v12",
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
