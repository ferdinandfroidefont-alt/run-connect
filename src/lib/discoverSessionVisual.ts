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
  return getFilterSportMeta(activityType).color;
}

/** Emoji + couleur carrousel Feed Découvrir (maquette RunConnect 27). */
const FILTER_SPORT_META: Record<string, { emoji: string; color: string }> = {
  course: { emoji: "🏃", color: "#007AFF" },
  trail: { emoji: "⛰️", color: "#AF52DE" },
  velo: { emoji: "🚴", color: "#FF3B30" },
  vtt: { emoji: "🚵", color: "#8E6E53" },
  bmx: { emoji: "🚲", color: "#FF9500" },
  gravel: { emoji: "🚴", color: "#FFCC00" },
  marche: { emoji: "🚶", color: "#34C759" },
  natation: { emoji: "🏊", color: "#5AC8FA" },
  football: { emoji: "⚽", color: "#34C759" },
  basket: { emoji: "🏀", color: "#FF9500" },
  volley: { emoji: "🏐", color: "#FF9500" },
  badminton: { emoji: "🏸", color: "#AF52DE" },
  pingpong: { emoji: "🏓", color: "#FF3B30" },
  tennis: { emoji: "🎾", color: "#FF9500" },
  escalade: { emoji: "🧗", color: "#8E8E93" },
  petanque: { emoji: "🎯", color: "#8E8E93" },
  rugby: { emoji: "🏉", color: "#34C759" },
  handball: { emoji: "🤾", color: "#FF9500" },
  fitness: { emoji: "💪", color: "#FF3B30" },
  yoga: { emoji: "🧘", color: "#AF52DE" },
  musculation: { emoji: "🏋️", color: "#1C1C1E" },
  crossfit: { emoji: "🔥", color: "#FF9500" },
  boxe: { emoji: "🥊", color: "#FF3B30" },
  arts_martiaux: { emoji: "🥋", color: "#5856D6" },
  golf: { emoji: "⛳", color: "#34C759" },
  ski: { emoji: "⛷️", color: "#AF52DE" },
  snowboard: { emoji: "🏂", color: "#5AC8FA" },
  randonnee: { emoji: "🥾", color: "#34C759" },
  kayak: { emoji: "🛶", color: "#5AC8FA" },
  surf: { emoji: "🏄", color: "#5AC8FA" },
};

export function getFilterSportMeta(activityType: string): { emoji: string; color: string } {
  const key = (activityType ?? "").toLowerCase();
  const exact = FILTER_SPORT_META[key];
  if (exact) return exact;
  return {
    emoji: getActivityEmoji(activityType),
    color: getDiscoverSportTileHexFallback(activityType),
  };
}

function getDiscoverSportTileHexFallback(activityType: string): string {
  const t = (activityType ?? "").toLowerCase();
  if (t.includes("vtt")) return "#8E6E53";
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
