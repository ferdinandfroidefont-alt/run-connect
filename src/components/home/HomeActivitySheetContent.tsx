import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { format, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import { useFeed, type FeedSession } from "@/hooks/useFeed";
import { SessionDetailsDialog } from "@/components/SessionDetailsDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function formatScheduleLabel(value: string) {
  const date = new Date(value);
  const when = isToday(date)
    ? `Aujourd'hui a ${format(date, "HH:mm", { locale: fr })}`
    : format(date, "EEE d MMM a HH:mm", { locale: fr });
  return when;
}

function formatDistanceKm(session: FeedSession) {
  const raw = session.title.match(/(\d+(?:[.,]\d+)?)\s?km/i)?.[1];
  if (!raw) return null;
  return `${raw.replace(",", ".")} km`;
}

export function HomeActivitySheetContent() {
  const navigate = useNavigate();
  const { feedItems, loading, refresh } = useFeed();
  const [selectedSession, setSelectedSession] = useState<Record<string, unknown> | null>(null);

  const items = useMemo(() => feedItems.slice(0, 6), [feedItems]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background px-ios-3 pb-ios-3">
      <div className="flex items-center justify-between px-ios-1 pb-ios-2 pt-ios-1">
        <h2 className="text-[20px] font-semibold leading-none tracking-tight text-foreground">Fil d'activite</h2>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-[15px] font-semibold text-[#007AFF] active:opacity-70"
          onClick={() => navigate("/feed")}
        >
          Voir tout
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="ios-scroll-region min-h-0 flex-1 overflow-y-auto pb-ios-2">
        {loading && items.length === 0 ? (
          <div className="space-y-ios-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="ios-list-row animate-pulse border border-white/70 dark:border-white/10">
                <div className="h-12 w-12 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/3 rounded-full bg-muted" />
                  <div className="h-3 w-1/2 rounded-full bg-muted" />
                  <div className="h-3 w-1/3 rounded-full bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="ios-card flex flex-col items-center gap-ios-3 p-ios-5 text-center">
            <p className="text-ios-subheadline font-medium text-foreground">Aucune activite recente</p>
            <button
              type="button"
              className="text-[15px] font-semibold text-[#007AFF] active:opacity-70"
              onClick={() => void refresh()}
            >
              Actualiser
            </button>
          </div>
        ) : (
          <div className="ios-list-stack">
            {items.map((session) => {
              const distance = formatDistanceKm(session);
              const displayName = session.organizer.display_name || session.organizer.username || "Utilisateur";
              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() =>
                    setSelectedSession({
                      ...session,
                      session_type: session.activity_type,
                      intensity: "moderate",
                      organizer_id: session.organizer.user_id,
                      profiles: {
                        username: session.organizer.username,
                        display_name: session.organizer.display_name,
                        avatar_url: session.organizer.avatar_url || undefined,
                      },
                    })
                  }
                  className="ios-list-row w-full border border-white dark:border-white/10 text-left"
                >
                  <div className="flex items-start gap-ios-2">
                    <Avatar className="h-11 w-11 shrink-0">
                      <AvatarImage src={session.organizer.avatar_url || undefined} alt={displayName} />
                      <AvatarFallback>{displayName.slice(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold text-foreground">
                        {displayName} a programme une seance
                      </p>
                      <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                        {formatScheduleLabel(session.scheduled_at)}
                        {distance ? ` • ${distance}` : ""}
                      </p>
                      <p className="mt-1 truncate text-[12px] text-muted-foreground">
                        📍 {session.location_name || "Lieu a definir"}
                      </p>
                    </div>
                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/60" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <SessionDetailsDialog
        session={selectedSession as never}
        onClose={() => setSelectedSession(null)}
        onSessionUpdated={() => refresh()}
      />
    </div>
  );
}
