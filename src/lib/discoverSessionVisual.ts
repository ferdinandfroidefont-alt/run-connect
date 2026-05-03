/**
 * Icônes « mockup 04 Découvrir » : emoji dans pastille colorée (pas Lucide).
 */
export function getActivityEmoji(activityType: string): string {
  const t = (activityType ?? "").toLowerCase();
  if (t.includes("velo") || t.includes("vtt") || t.includes("bike") || t.includes("cycl") || t.includes("gravel"))
    return "🚴";
  if (t.includes("nat") || t.includes("swim") || t.includes("kayak") || t.includes("surf"))
    return "🏊";
  if (t.includes("trail") || t.includes("rando") || t.includes("marche") || t.includes("walk") || t.includes("hike"))
    return "🥾";
  if (t.includes("ski") || t.includes("snow"))
    return "⛷️";
  return "🏃";
}

/** Fond pastille liste Dćcouvrir — aligné apple-screens SessionRow */
export function getDiscoverSportTileClass(activityType: string): string {
  const t = (activityType ?? "").toLowerCase();
  if (t.includes("velo") || t.includes("vtt") || t.includes("bike") || t.includes("cycl") || t.includes("gravel"))
    return "bg-[#ff375f]";
  if (t.includes("nat") || t.includes("swim") || t.includes("kayak") || t.includes("surf"))
    return "bg-[#5ac8fa]";
  if (t.includes("trail") || t.includes("rando") || t.includes("marche") || t.includes("walk"))
    return "bg-[#34c759]";
  return "bg-[#007AFF]";
}
