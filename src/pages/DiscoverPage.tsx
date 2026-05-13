import { useCallback, useState } from "react";
import { MapPin, Users } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useFeed } from "@/hooks/useFeed";
import { useDiscoverFeed } from "@/hooks/useDiscoverFeed";
import { shortLocation, toneHexForActivity } from "@/components/feed/FeedSessionTile";
import { SessionDetailsDialog } from "@/components/SessionDetailsDialog";
import { DiscoverChromeShell } from "@/components/discover/DiscoverChromeShell";
import { DiscoverMapCard } from "@/components/discover/DiscoverMapCard";
import { ACTION_BLUE } from "@/components/discover/DiscoverChromeShell";

export function DiscoverPage() {
  const [selectedSession, setSelectedSession] = useState<Record<string, unknown> | null>(null);

  const { refresh: refreshFeed } = useFeed();
  const {
    sessions: discoverSessions,
    loading: discoverLoading,
    refresh: refreshDiscover,
  } = useDiscoverFeed();

  const onPullRefresh = useCallback(async () => {
    await Promise.allSettled([refreshFeed(), refreshDiscover()]);
  }, [refreshFeed, refreshDiscover]);

  const onPin = useCallback(
    (session: (typeof discoverSessions)[number]) => {
      setSelectedSession({
        ...session,
        session_type: session.activity_type,
        profiles: {
          username: session.organizer.username,
          display_name: session.organizer.display_name,
          avatar_url: session.organizer.avatar_url,
        },
      });
    },
    [],
  );

  return (
    <>
      <DiscoverChromeShell activeChip="carte" enablePullRefresh onPullRefresh={onPullRefresh}>
        <div className="relative mt-4">
          <DiscoverMapCard sessions={discoverSessions} onSessionMarkerClick={onPin} />

          <div className="pointer-events-none absolute bottom-3 left-3 right-3">
            <div className="rounded-xl bg-white/95 p-3 shadow-sm backdrop-blur-md">
              <p className="text-[13px] font-semibold text-[#0A0F1F]">
                {discoverLoading
                  ? "Chargement…"
                  : `${discoverSessions.length} séance${discoverSessions.length !== 1 ? "s" : ""} autour de toi`}
              </p>
              {discoverSessions[0]?.location_name ? (
                <p className="mt-0.5 text-[12px] text-[#8E8E93]">
                  {shortLocation(discoverSessions[0].location_name)}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <h2 className="mt-6 mb-3 text-[22px] font-bold text-[#0A0F1F]">Près de chez toi</h2>

        {discoverLoading && discoverSessions.length === 0 ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : discoverSessions.length === 0 ? (
          <p className="py-8 text-center text-[15px] text-[#8E8E93]">Aucune séance autour de toi</p>
        ) : (
          discoverSessions.slice(0, 12).map((s) => (
            <div
              key={s.id}
              className="mb-2.5 flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
            >
              <div
                className="h-11 w-11 flex-shrink-0 rounded-full"
                style={{
                  background: `linear-gradient(135deg, ${toneHexForActivity(s.activity_type)}55, ${toneHexForActivity(s.activity_type)})`,
                }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-bold text-[#0A0F1F]">{s.title}</p>
                <p className="text-[13px] text-[#8E8E93]">
                  {s.organizer.display_name || s.organizer.username} ·{" "}
                  {format(new Date(s.scheduled_at), "HH:mm", { locale: fr })}
                </p>
                <div className="mt-1 flex items-center gap-3">
                  <span className="flex items-center gap-1 text-[12px] text-[#8E8E93]">
                    <MapPin className="h-3 w-3" />
                    {typeof s.distance_km === "number" ? `${s.distance_km.toFixed(1)} km` : "—"}
                  </span>
                  <span className="flex items-center gap-1 text-[12px] text-[#8E8E93]">
                    <Users className="h-3 w-3" />
                    {s.current_participants}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="flex-shrink-0 touch-manipulation rounded-full px-3 py-1.5 text-[13px] font-semibold text-white"
                style={{ background: ACTION_BLUE }}
                onClick={() =>
                  setSelectedSession({
                    ...s,
                    session_type: s.activity_type,
                    profiles: {
                      username: s.organizer.username,
                      display_name: s.organizer.display_name,
                      avatar_url: s.organizer.avatar_url,
                    },
                  })
                }
              >
                Rejoindre
              </button>
            </div>
          ))
        )}
      </DiscoverChromeShell>

      <SessionDetailsDialog
        session={selectedSession as any}
        onClose={() => setSelectedSession(null)}
        onSessionUpdated={() => {
          void refreshDiscover();
          void refreshFeed();
        }}
      />
    </>
  );
}
