import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useFeed, type FeedSession } from "@/hooks/useFeed";
import { SessionDetailsDialog } from "@/components/SessionDetailsDialog";
import { ActivityIcon } from "@/lib/activityIcons";
import { useGeolocation } from "@/hooks/useGeolocation";
import { cn } from "@/lib/utils";

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km: number | null) {
  if (km == null || !Number.isFinite(km)) return null;
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

export function HomeActivitySheetContent() {
  const navigate = useNavigate();
  const { feedItems, loading, refresh } = useFeed();
  const [selectedSession, setSelectedSession] = useState<Record<string, unknown> | null>(null);

  const items = useMemo(() => feedItems.slice(0, 6), [feedItems]);

  // Refonte Apple Discover bottom sheet (mockup 04) :
  // - Title display 22/700/-0.4
  // - Subtitle 12 ink60
  // - "Voir tout" blue link 15/500 sans flèche (mockup)
  const subtitleCount = items.length;
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-transparent px-3 pb-3">
      <div className="flex items-baseline justify-between px-1 pb-2 pt-1">
        <div>
          <h2 className="font-display text-[22px] font-bold leading-tight tracking-[-0.4px] text-foreground">
            À la une
          </h2>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {subtitleCount > 0 ? `${subtitleCount} séances · aujourd'hui` : "Aucune séance · aujourd'hui"}
          </p>
        </div>
        <button
          type="button"
          className="text-[15px] font-medium text-primary active:opacity-70"
          onClick={() => navigate("/feed")}
        >
          Voir tout
        </button>
      </div>

      <div className="ios-scroll-region min-h-0 flex-1 overflow-y-auto pb-ios-2">
        {loading && items.length === 0 ? (
          // Skeletons : même pattern apple-group-stack qu'à l'état chargé pour éviter le saut visuel.
          <div className="apple-group-stack mx-1 overflow-hidden">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className={cn("apple-cell animate-pulse", i === 2 && "apple-cell-last")}
              >
                <div className="h-11 w-11 shrink-0 rounded-full bg-muted" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-4 w-2/3 rounded-full bg-muted" />
                  <div className="h-3 w-1/2 rounded-full bg-muted" />
                  <div className="h-3 w-1/3 rounded-full bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="apple-group-stack mx-1 flex flex-col items-center gap-ios-3 p-ios-5 text-center">
            <p className="text-ios-subheadline font-medium text-foreground">Aucune activité récente</p>
            <button
              type="button"
              className="text-[15px] font-semibold text-primary active:opacity-70"
              onClick={() => void refresh()}
            >
              Actualiser
            </button>
          </div>
        ) : (
          // Mockup ScreenDiscover bottom sheet : un seul Group inset rounded-12 contenant les SessionRow
          // empilées avec séparateurs hairline 0.5px (apple-cell). Avatar 44×44 ronde, titre 16/600,
          // sous-titre 13 muted, chevron à droite (legacy : pas de pill REJOINDRE pour ne pas modifier
          // le flux d'ouverture du dialog).
          <div className="apple-group-stack mx-1 overflow-hidden">
            {items.map((session, idx) => {
              const distance = formatDistanceKm(session);
              const displayName = session.organizer.display_name || session.organizer.username || "Utilisateur";
              const isLast = idx === items.length - 1;
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
                  className={cn(
                    "apple-cell w-full appearance-none border-0 bg-transparent text-left transition-colors active:bg-muted/40",
                    isLast && "apple-cell-last"
                  )}
                >
                  <Avatar className="h-11 w-11 shrink-0">
                    <AvatarImage src={session.organizer.avatar_url || undefined} alt={displayName} />
                    <AvatarFallback>{displayName.slice(0, 1).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[16px] font-semibold leading-tight tracking-[-0.4px] text-foreground">
                      {displayName} a programmé une séance
                    </p>
                    <p className="mt-0.5 truncate text-[13px] leading-snug text-muted-foreground">
                      {formatScheduleLabel(session.scheduled_at)}
                      {distance ? ` · ${distance}` : ""}
                    </p>
                    <p className="mt-0.5 truncate text-[13px] leading-snug text-muted-foreground">
                      📍 {session.location_name || "Lieu à définir"}
                    </p>
                  </div>
                  <ChevronGlyph className="apple-cell-chevron" />
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
