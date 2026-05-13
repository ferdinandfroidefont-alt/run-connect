import { useCallback, useEffect, useMemo, useRef } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import type { FeedSession } from "@/hooks/useFeed";
import type { DiscoverSession } from "@/hooks/useDiscoverFeed";
import { DiscoverFilters } from "@/components/feed/DiscoverFilters";
import { DiscoverActivityMaquetteCard } from "@/components/discover/DiscoverActivityMaquetteCard";
import { sessionLikelyLive, shortLocation } from "@/components/feed/FeedSessionTile";
import { ACTION_BLUE } from "@/components/discover/DiscoverChromeShell";

type FeedSubTab = "amis" | "decouvrir";

type DiscoverFeedInlineSectionProps = {
  subTab: FeedSubTab;
  onSubTabChange: (t: FeedSubTab) => void;
  friendCount: number | null;
  feedItems: FeedSession[];
  friendsLoading: boolean;
  hasMore: boolean;
  loadMore: () => void;
  discoverSessions: DiscoverSession[];
  discoverLoading: boolean;
  maxDistance: number;
  setMaxDistance: (distance: number) => void;
  selectedActivities: string[];
  toggleActivity: (activity: string) => void;
  toggleAllActivities: () => void;
  joinSession: (session: DiscoverSession) => void | Promise<void>;
  onOpenDiscoverSession: (session: DiscoverSession) => void;
  onOpenFriendSession: (session: FeedSession) => void;
};

export function DiscoverFeedInlineSection({
  subTab,
  onSubTabChange,
  friendCount,
  feedItems,
  friendsLoading,
  hasMore,
  loadMore,
  discoverSessions,
  discoverLoading,
  maxDistance,
  setMaxDistance,
  selectedActivities,
  toggleActivity,
  toggleAllActivities,
  joinSession,
  onOpenDiscoverSession,
  onOpenFriendSession,
}: DiscoverFeedInlineSectionProps) {
  const navigate = useNavigate();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const renderFriendsWhen = useCallback((s: FeedSession) => {
    const d = new Date(s.scheduled_at);
    if (sessionLikelyLive(s.scheduled_at)) return "EN COURS · live";
    return `programme · ${format(d, "HH:mm", { locale: fr })}`;
  }, []);

  const renderDiscoverWhen = useCallback((s: DiscoverSession) => {
    const d = new Date(s.scheduled_at);
    if (sessionLikelyLive(s.scheduled_at)) return "EN COURS · live";
    const h = d.getHours();
    if (h >= 17) return `programme · ce soir ${format(d, "HH")}h`;
    return `programme · ${format(d, "HH:mm", { locale: fr })}`;
  }, []);

  const friendLabel = useMemo(() => {
    const n = friendCount ?? 0;
    return `Amis · ${n}`;
  }, [friendCount]);

  useEffect(() => {
    if (subTab !== "amis") return;
    const el = loadMoreRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !friendsLoading) loadMore();
      },
      { threshold: 0.12 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, friendsLoading, loadMore, subTab]);

  return (
    <>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => onSubTabChange("amis")}
          className="rounded-full px-5 py-2 text-[15px] font-semibold"
          style={{
            background: subTab === "amis" ? ACTION_BLUE : "transparent",
            color: subTab === "amis" ? "white" : ACTION_BLUE,
            border: subTab === "amis" ? "none" : `1.5px solid ${ACTION_BLUE}`,
          }}
        >
          {friendLabel}
        </button>
        <button
          type="button"
          onClick={() => onSubTabChange("decouvrir")}
          className="rounded-full px-5 py-2 text-[15px] font-semibold"
          style={{
            background: subTab === "decouvrir" ? ACTION_BLUE : "transparent",
            color: subTab === "decouvrir" ? "white" : ACTION_BLUE,
            border: subTab === "decouvrir" ? "none" : `1.5px solid ${ACTION_BLUE}`,
          }}
        >
          Découvrir
        </button>
      </div>

      {subTab === "decouvrir" ? (
        <div className="mt-4">
          <DiscoverFilters
            maxDistance={maxDistance}
            setMaxDistance={setMaxDistance}
            selectedActivities={selectedActivities}
            toggleActivity={toggleActivity}
            toggleAllActivities={toggleAllActivities}
          />
        </div>
      ) : null}

      <div className="mt-5 space-y-4">
        {subTab === "amis" &&
          (friendsLoading && feedItems.length === 0 ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : feedItems.length === 0 ? (
            <p className="py-10 text-center text-[15px] text-[#8E8E93]">Aucune activité de tes amis pour l’instant.</p>
          ) : (
            <>
              {feedItems.map((s) => {
                const name = s.organizer.display_name || s.organizer.username;
                const joinLabel = sessionLikelyLive(s.scheduled_at) ? "Suivre" : "Rejoindre";
                return (
                  <DiscoverActivityMaquetteCard
                    key={s.id}
                    name={name}
                    subtitle={renderFriendsWhen(s)}
                    title={`${s.title} · ${shortLocation(s.location_name)}`}
                    lat={s.location_lat}
                    lng={s.location_lng}
                    sessionId={s.id}
                    activityType={s.activity_type}
                    organizerAvatarUrl={s.organizer.avatar_url || null}
                    onComment={() =>
                      navigate("/feed", { state: { openFeedCommentSessionId: s.id } })
                    }
                    onJoin={() => {
                      if (sessionLikelyLive(s.scheduled_at)) {
                        onOpenFriendSession(s);
                        return;
                      }
                      navigate("/", { state: { openSessionId: s.id } });
                    }}
                    joinLabel={joinLabel}
                  />
                );
              })}
              <div ref={loadMoreRef} className="h-2 w-full shrink-0" aria-hidden />
              {friendsLoading && feedItems.length > 0 ? (
                <div className="flex justify-center py-4">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : null}
            </>
          ))}

        {subTab === "decouvrir" &&
          (discoverLoading && discoverSessions.length === 0 ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : discoverSessions.length === 0 ? (
            <p className="py-10 text-center text-[15px] text-[#8E8E93]">Aucune séance trouvée avec ces filtres.</p>
          ) : (
            discoverSessions.map((s) => {
              const name = s.organizer.display_name || s.organizer.username;
              return (
                <DiscoverActivityMaquetteCard
                  key={s.id}
                  name={name}
                  subtitle={renderDiscoverWhen(s)}
                  title={`${s.title} · ${shortLocation(s.location_name)}`}
                  lat={s.location_lat}
                  lng={s.location_lng}
                  sessionId={s.id}
                  activityType={s.activity_type}
                  organizerAvatarUrl={s.organizer.avatar_url}
                  onComment={() => navigate("/feed", { state: { openFeedCommentSessionId: s.id } })}
                  onJoin={() =>
                    sessionLikelyLive(s.scheduled_at) ? onOpenDiscoverSession(s) : void joinSession(s)
                  }
                  joinLabel={sessionLikelyLive(s.scheduled_at) ? "Suivre" : "Rejoindre"}
                />
              );
            })
          ))}
      </div>
    </>
  );
}
