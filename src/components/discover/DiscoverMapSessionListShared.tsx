import { format, isToday, isTomorrow, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";
import { sessionLikelyLive } from "@/components/feed/FeedSessionTile";
import { ACTION_BLUE } from "@/components/discover/DiscoverChromeShell";

type MapSessionSportKey = "run" | "bike" | "swim" | "trail" | "walk";

const SPORT_BADGE: Record<MapSessionSportKey, { emoji: string; bg: string }> = {
  run: { emoji: "🏃", bg: ACTION_BLUE },
  bike: { emoji: "🚴", bg: "#FF3B30" },
  swim: { emoji: "🏊", bg: "#30B0C7" },
  trail: { emoji: "🥾", bg: "#34C759" },
  walk: { emoji: "🚶", bg: "#8E8E93" },
};

function activityTypeToSportKey(activityType: string): MapSessionSportKey {
  const t = (activityType ?? "").toLowerCase();
  if (t.includes("velo") || t.includes("vtt") || t.includes("bmx") || t.includes("gravel")) return "bike";
  if (t.includes("nat") || t.includes("swim") || t.includes("kayak") || t.includes("surf")) return "swim";
  if (t.includes("trail") || t.includes("rando") || t.includes("randon")) return "trail";
  if (t.includes("marche") || t.includes("walk")) return "walk";
  return "run";
}

/** Aligné sur SportBadge maquette RunConnect — ligne liste sous carte. */
export function DiscoverMapSessionSportBadge({
  activityType,
  size = 44,
}: {
  activityType: string;
  size?: number;
}) {
  const sport = activityTypeToSportKey(activityType);
  const { emoji, bg } = SPORT_BADGE[sport];
  return (
    <div
      className="flex flex-shrink-0 items-center justify-center rounded-2xl"
      style={{
        width: size,
        height: size,
        background: bg,
        fontSize: Math.round(size * 0.5),
        lineHeight: 1,
      }}
      aria-hidden
    >
      <span style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.15))" }}>{emoji}</span>
    </div>
  );
}

/** Libellé horaire maquette (ex. Demain 18:00, Sam 09:00). */
export function formatDiscoverMapSessionTimeLabel(scheduledAt: string): string {
  const d = new Date(scheduledAt);
  const timeStr = format(d, "HH:mm", { locale: fr });
  if (sessionLikelyLive(scheduledAt)) return "En cours";
  if (isToday(d)) return `Aujourd'hui ${timeStr}`;
  if (isTomorrow(d)) return `Demain ${timeStr}`;
  if (isYesterday(d)) return `Hier ${timeStr}`;
  const dayShort = format(d, "EEE", { locale: fr }).replace(/\.$/, "");
  const cap = dayShort.charAt(0).toUpperCase() + dayShort.slice(1);
  return `${cap.slice(0, 3)} ${timeStr}`;
}
