import { useEffect, useMemo, useRef } from "react";
import { MapPin, Users } from "lucide-react";
import type { FeedSession } from "@/hooks/useFeed";
import { sessionIsPast, sessionLikelyLive, shortLocation } from "@/components/feed/FeedSessionTile";
import { ACTION_BLUE } from "@/components/discover/DiscoverChromeShell";
import {
  DiscoverMapSessionSportBadge,
  formatDiscoverMapSessionTimeLabel,
} from "@/components/discover/DiscoverMapSessionListShared";

type DiscoverFriendsSessionsSectionProps = {
  sessions: FeedSession[];
  loading: boolean;
  hasMore: boolean;
  loadMore: () => void;
  onRowPress: (session: FeedSession) => void;
};

/**
 * Liste scrollable sous la carte Découvrir : toutes les séances publiées par les amis,
 * y compris terminées (via le même flux que l’onglet Activités → Amis).
 */
export function DiscoverFriendsSessionsSection({
  sessions,
  loading,
  hasMore,
  loadMore,
  onRowPress,
}: DiscoverFriendsSessionsSectionProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const sortedSessions = useMemo(() => {
    const upcoming = sessions
      .filter((s) => !sessionIsPast(s.scheduled_at))
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
    const past = sessions
      .filter((s) => sessionIsPast(s.scheduled_at))
      .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());
    return [...upcoming, ...past];
  }, [sessions]);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loading) loadMore();
      },
      { threshold: 0.12 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loading, loadMore]);

  return (
    <>
      <h2 className="mb-3 mt-6 text-[22px] font-bold text-[#0A0F1F]">Séances de tes amis</h2>

      {loading && sessions.length === 0 ? (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : sessions.length === 0 ? (
        <p className="py-8 text-center text-[15px] text-[#8E8E93]">
          Aucune séance pour l’instant — invite des amis ou reviens plus tard.
        </p>
      ) : (
        <>
          {sortedSessions.map((s) => {
            const organizer = s.organizer.display_name || s.organizer.username;
            const live = sessionLikelyLive(s.scheduled_at);
            const past = sessionIsPast(s.scheduled_at);
            const locShort = shortLocation(s.location_name);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onRowPress(s)}
                className="mb-2.5 flex min-w-0 w-full items-center gap-3 rounded-2xl bg-white p-3.5 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] active:bg-[#F8F8F8]"
              >
                <DiscoverMapSessionSportBadge activityType={s.activity_type} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold text-[#0A0F1F]">{s.title}</p>
                  <p className="text-[13px] text-[#8E8E93]">
                    {organizer} · {formatDiscoverMapSessionTimeLabel(s.scheduled_at)}
                  </p>
                  <div className="mt-1 flex min-w-0 items-center gap-3">
                    <span className="flex min-w-0 items-center gap-1 text-[12px] text-[#8E8E93]">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{locShort || "—"}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-[12px] text-[#8E8E93]">
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
          })}
          {hasMore ? (
            <div ref={loadMoreRef} className="flex justify-center py-6">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : sortedSessions.length > 0 ? (
            <p className="py-4 text-center text-[13px] text-[#8E8E93]">Fin de la liste</p>
          ) : null}
        </>
      )}
    </>
  );
}
