import { useMemo } from "react";
import { MapPin, Users } from "lucide-react";
import { format, isToday, isTomorrow, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";
import type { DiscoverSession } from "@/hooks/useDiscoverFeed";
import { sessionIsPast, sessionLikelyLive } from "@/components/feed/FeedSessionTile";
import { ACTION_BLUE } from "@/components/discover/DiscoverChromeShell";

type NearYouSportKey = "run" | "bike" | "swim" | "trail" | "walk";

const SPORT_BADGE: Record<NearYouSportKey, { emoji: string; bg: string }> = {
  run: { emoji: "🏃", bg: ACTION_BLUE },
  bike: { emoji: "🚴", bg: "#FF3B30" },
  swim: { emoji: "🏊", bg: "#30B0C7" },
  trail: { emoji: "🥾", bg: "#34C759" },
  walk: { emoji: "🚶", bg: "#8E8E93" },
};

function activityTypeToNearYouSport(activityType: string): NearYouSportKey {
  const t = (activityType ?? "").toLowerCase();
  if (t.includes("velo") || t.includes("vtt") || t.includes("bmx") || t.includes("gravel")) return "bike";
  if (t.includes("nat") || t.includes("swim") || t.includes("kayak") || t.includes("surf")) return "swim";
  if (t.includes("trail") || t.includes("rando") || t.includes("randon")) return "trail";
  if (t.includes("marche") || t.includes("walk")) return "walk";
  return "run";
}

/** Aligné sur SportBadge de la maquette RunConnect (6).jsx — SessionPreview */
function NearYouSportBadge({ activityType, size = 44 }: { activityType: string; size?: number }) {
  const sport = activityTypeToNearYouSport(activityType);
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

function pickNearYouPreviewSessions(sessions: DiscoverSession[]): DiscoverSession[] {
  const upcoming = sessions
    .filter((s) => !sessionIsPast(s.scheduled_at))
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  if (upcoming.length > 0) return upcoming.slice(0, 3);
  const past = sessions
    .filter((s) => sessionIsPast(s.scheduled_at))
    .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());
  return past.slice(0, 3);
}

/** Libellé horaire façon maquette (ex. Demain 18:00, Sam 09:00) */
function formatNearYouTimeLabel(scheduledAt: string): string {
  const d = new Date(scheduledAt);
  const timeStr = format(d, "HH:mm", { locale: fr });
  if (sessionLikelyLive(scheduledAt)) return "En cours";
  if (isToday(d)) return `Aujourd'hui ${timeStr}`;
  if (isTomorrow(d)) return `Demain ${timeStr}`;
  if (isYesterday(d)) return `Hier ${timeStr}`;
  const dayShort = format(d, "EEE", { locale: fr }).replace(/\.$/, "");
  const cap = dayShort.charAt(0).toUpperCase() + dayShort.slice(1);
  // Ex. "Sam 09:00" comme dans la maquette
  return `${cap.slice(0, 3)} ${timeStr}`;
}

type DiscoverNearYouSectionProps = {
  sessions: DiscoverSession[];
  loading: boolean;
  /** Clic sur la ligne : même logique que le feed (live → fiche, sinon rejoindre) */
  onRowPress: (session: DiscoverSession) => void;
};

/**
 * Bloc « Près de chez toi » sous la carte — structure CSS identique à SessionPreview (maquette RunConnect).
 */
export function DiscoverNearYouSection({ sessions, loading, onRowPress }: DiscoverNearYouSectionProps) {
  const previewSessions = useMemo(() => pickNearYouPreviewSessions(sessions), [sessions]);

  return (
    <>
      <h2 className="mb-3 mt-6 text-[22px] font-bold text-[#0A0F1F]">Près de chez toi</h2>

      {loading && sessions.length === 0 ? (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : sessions.length === 0 ? (
        <p className="py-8 text-center text-[15px] text-[#8E8E93]">Aucune séance autour de toi</p>
      ) : (
        previewSessions.map((s) => {
          const organizer = s.organizer.display_name || s.organizer.username;
          const live = sessionLikelyLive(s.scheduled_at);
          const past = sessionIsPast(s.scheduled_at);
          const distanceLabel =
            typeof s.distance_km === "number" ? `${s.distance_km.toFixed(1)} km` : "—";
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onRowPress(s)}
              className="mb-2.5 flex w-full items-center gap-3 rounded-2xl bg-white p-3.5 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] active:bg-[#F8F8F8]"
            >
              <NearYouSportBadge activityType={s.activity_type} size={44} />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold text-[#0A0F1F]">{s.title}</p>
                <p className="text-[13px] text-[#8E8E93]">
                  {organizer} · {formatNearYouTimeLabel(s.scheduled_at)}
                </p>
                <div className="mt-1 flex items-center gap-3">
                  <span className="flex items-center gap-1 text-[12px] text-[#8E8E93]">
                    <MapPin className="h-3 w-3" />
                    {distanceLabel}
                  </span>
                  <span className="flex items-center gap-1 text-[12px] text-[#8E8E93]">
                    <Users className="h-3 w-3" />
                    {s.current_participants}
                  </span>
                </div>
              </div>
              <span
                className="flex-shrink-0 rounded-full px-3 py-1.5 text-[13px] font-semibold text-white"
                style={{ background: ACTION_BLUE }}
              >
                {live ? "Suivre" : past ? "Voir" : "Rejoindre"}
              </span>
            </button>
          );
        })
      )}
    </>
  );
}
