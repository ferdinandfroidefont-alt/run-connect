import { MAPBOX_STYLE_BY_UI_ID } from "@/lib/mapboxConfig";

/** Styles palette « Découvrir » (carte embarquée) — alignés maquette + 3D + sombre. */
export type DiscoverMapPaletteId = "standard" | "satellite" | "terrain" | "standard3d" | "dark";

const PALETTE_TO_MAPBOX_KEY: Record<DiscoverMapPaletteId, keyof typeof MAPBOX_STYLE_BY_UI_ID> = {
  standard: "roadmap",
  satellite: "satellite",
  terrain: "terrain",
  standard3d: "standard3d",
  dark: "dark",
};

export function discoverPaletteToStyleUrl(id: DiscoverMapPaletteId): string {
  const key = PALETTE_TO_MAPBOX_KEY[id];
  return MAPBOX_STYLE_BY_UI_ID[key] ?? MAPBOX_STYLE_BY_UI_ID.roadmap;
}

export const DISCOVER_MAP_PALETTE_ROWS: {
  id: DiscoverMapPaletteId;
  emoji: string;
  accent: string;
  label: string;
  hint: string;
}[] = [
  { id: "standard", emoji: "🗺️", accent: "#34C759", label: "Standard", hint: "Vue par défaut" },
  { id: "satellite", emoji: "🛰️", accent: "#0A0F1F", label: "Satellite", hint: "Vue aérienne" },
  { id: "terrain", emoji: "⛰️", accent: "#8B5E3C", label: "Terrain", hint: "Relief et reliefs" },
  { id: "standard3d", emoji: "🏙️", accent: "#5856D6", label: "3D", hint: "Bâtiments et perspective" },
  { id: "dark", emoji: "🌙", accent: "#1D1D60", label: "Sombre", hint: "Carte nocturne" },
];

/** Pitch carte après fit — style Mapbox Standard / 3D. */
export const DISCOVER_MAP_3D_PITCH = 52;
