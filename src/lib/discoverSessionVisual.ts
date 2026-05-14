/**
 * Icônes « mockup 04 Découvrir » : emoji dans pastille colorée (pas Lucide).
 * Liste (feuille filtres carte accueil / lignes type Réglages) : même échelle que les lignes ~52px.
 */
export const DISCOVER_FILTER_EMOJI_BADGE_CLASS =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-[22px] leading-none text-white shadow-sm";

/** Chips filtres horizontaux écran Découvrir (compact). */
export const DISCOVER_FILTER_EMOJI_BADGE_COMPACT_CLASS =
  "flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] text-[14px] leading-none text-white";

export function getActivityEmoji(activityType: string): string {
  const t = (activityType ?? "").toLowerCase();
  if (t.includes("velo") || t.includes("vtt") || t.includes("bike") || t.includes("cycl") || t.includes("gravel"))
    return "🚴";
  if (t.includes("nat") || t.includes("swim") || t.includes("kayak") || t.includes("surf"))
    return "🏊";
  if (t.includes("triath")) return "🏅";
  if (t.includes("trail") || t.includes("rando") || t.includes("marche") || t.includes("walk") || t.includes("hike"))
    return "🥾";
  if (t.includes("ski") || t.includes("snow"))
    return "⛷️";
  return "🏃";
}

/** Fond pastille liste Dćcouvrir — aligné apple-screens SessionRow */
export function getDiscoverSportTileClass(activityType: string): string {
  const t = (activityType ?? "").toLowerCase();
  if (t.includes("vtt")) return "bg-[#8B5E3C]";
  if (t.includes("gravel")) return "bg-[#FFCC00]";
  if (t.includes("velo") || t.includes("bike") || t.includes("cycl")) return "bg-[#FF3B30]";
  if (t.includes("nat") || t.includes("swim") || t.includes("kayak") || t.includes("surf"))
    return "bg-[#5ac8fa]";
  if (t.includes("trail")) return "bg-[#AF52DE]";
  if (t.includes("triath")) return "bg-[#5856D6]";
  if (t.includes("rando") || t.includes("marche") || t.includes("walk") || t.includes("hike"))
    return "bg-[#34C759]";
  return "bg-[#007AFF]";
}

/** Couleur pleine pastille Filtres maquette (alignée sur `getDiscoverSportTileClass`). */
export function getDiscoverSportTileHex(activityType: string): string {
  const t = (activityType ?? "").toLowerCase();
  if (t.includes("vtt")) return "#8B5E3C";
  if (t.includes("gravel")) return "#FFCC00";
  if (t.includes("velo") || t.includes("bike") || t.includes("cycl")) return "#FF3B30";
  if (t.includes("nat") || t.includes("swim") || t.includes("kayak") || t.includes("surf"))
    return "#5AC8FA";
  if (t.includes("trail")) return "#AF52DE";
  if (t.includes("triath")) return "#5856D6";
  if (t.includes("rando") || t.includes("marche") || t.includes("walk") || t.includes("hike"))
    return "#34C759";
  return "#007AFF";
}
