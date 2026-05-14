import { useCallback, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useDiscoverFeed } from "@/hooks/useDiscoverFeed";
import { sessionLikelyLive, shortLocation } from "@/components/feed/FeedSessionTile";
import { SessionDetailsDialog } from "@/components/SessionDetailsDialog";
import { DiscoverChromeShell } from "@/components/discover/DiscoverChromeShell";

export default function DiscoverLivePage() {
  const [selectedSession, setSelectedSession] = useState<Record<string, unknown> | null>(null);
  const { sessions, loading, joinSession, refresh } = useDiscoverFeed();
  const liveSessions = sessions.filter((s) => sessionLikelyLive(s.scheduled_at));

  const onPull = useCallback(async () => {
    await refresh();
  }, [refresh]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <DiscoverChromeShell activeChip="live" enablePullRefresh onPullRefresh={onPull}>
        <div className="mt-4 pb-24">
          {loading && liveSessions.length === 0 ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : liveSessions.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#FF3B30]/10">
                <div className="h-3 w-3 rounded-full bg-[#FF3B30]" />
              </div>
              <p className="text-[15px] font-semibold text-[#0A0F1F]">Aucune session en direct</p>
              <p className="mt-1 text-[13px] text-[#8E8E93]">Les séances dans leur créneau horaire apparaissent ici.</p>
            </div>
          ) : (
            liveSessions.map((s) => (
              <div
                key={s.id}
                className="mb-2.5 flex min-w-0 items-center gap-3 rounded-2xl bg-white p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-3 text-left touch-manipulation transition-colors active:opacity-85"
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
                  <div className="relative flex-shrink-0">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FF3B30]/10">
                      <div className="h-3 w-3 animate-pulse rounded-full bg-[#FF3B30]" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-bold text-[#0A0F1F]">{s.title}</p>
                    <p className="text-[13px] text-[#8E8E93]">
                      EN COURS · {s.organizer.display_name || s.organizer.username}
                      {shortLocation(s.location_name)
                        ? ` · ${shortLocation(s.location_name)}`
                        : ""}
                    </p>
                    <p className="mt-1 text-[12px] text-[#8E8E93]">
                      {format(new Date(s.scheduled_at), "HH:mm", { locale: fr })}
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  className="flex-shrink-0 touch-manipulation rounded-full bg-[#FF3B30] px-3 py-1.5 text-[13px] font-semibold text-white active:opacity-90"
                  onClick={() => void joinSession(s)}
                >
                  Suivre
                </button>
              </div>
            ))
          )}
        </div>
      </DiscoverChromeShell>

      <SessionDetailsDialog
        session={selectedSession as any}
        onClose={() => setSelectedSession(null)}
        onSessionUpdated={() => void refresh()}
      />
    </div>
  );
}
