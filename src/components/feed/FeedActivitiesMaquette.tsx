import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFeed, type FeedSession } from "@/hooks/useFeed";
import { useDiscoverFeed, type DiscoverSession } from "@/hooks/useDiscoverFeed";
import { IosFixedPageHeaderShell } from "@/components/layout/IosFixedPageHeaderShell";
import { IosPageHeaderBar } from "@/components/layout/IosPageHeaderBar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SessionDetailsDialog } from "@/components/SessionDetailsDialog";
import { FeedEmptyState } from "@/components/feed/FeedEmptyState";
import { DiscoverEmptyState } from "@/components/feed/DiscoverEmptyState";
import { DiscoverFilters } from "@/components/feed/DiscoverFilters";
import {
  FeedSessionTile,
  sessionLikelyLive,
  shortLocation,
  toneHexForActivity,
} from "@/components/feed/FeedSessionTile";
import { fetchFeedSessionForDiscussion, SessionDiscussionView } from "@/components/feed/SessionDiscussionView";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type FeedMode = "friends" | "discover";

export function FeedActivitiesMaquette() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [mode, setMode] = useState<FeedMode>("friends");
  const [friendCount, setFriendCount] = useState<number | null>(null);
  const [selectedFriendsSession, setSelectedFriendsSession] = useState<Record<string, unknown> | null>(null);
  const [selectedDiscoverSession, setSelectedDiscoverSession] = useState<Record<string, unknown> | null>(null);
  const [discussionSessionId, setDiscussionSessionId] = useState<string | null>(null);
  const [discussionSessionOverride, setDiscussionSessionOverride] = useState<FeedSession | null>(null);
  const [discussionSessionFetching, setDiscussionSessionFetching] = useState(false);

  const { feedItems, loading: friendsLoading, hasMore, loadMore, refresh: refreshFriends, addComment } = useFeed();

  const {
    sessions: discoverSessions,
    loading: discoverLoading,
    hasLocation,
    maxDistance,
    setMaxDistance,
    selectedActivities,
    toggleActivity,
    toggleAllActivities,
    joinSession,
    refresh: refreshDiscover,
    resetFilters,
  } = useDiscoverFeed();

  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { count, error } = await supabase
        .from("user_follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", user.id)
        .eq("status", "accepted");
      if (!error) setFriendCount(count ?? 0);
    })();
  }, [user?.id]);

  useEffect(() => {
    const st = location.state as { openFeedCommentSessionId?: string } | null;
    if (!st?.openFeedCommentSessionId) return;
    setMode("friends");
    setDiscussionSessionFetching(true);
    setDiscussionSessionId(st.openFeedCommentSessionId);
    navigate(`${location.pathname}${location.search}`, { replace: true, state: {} });
  }, [location.state, location.pathname, location.search, navigate]);

  useEffect(() => {
    if (mode !== "friends") return;
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
  }, [hasMore, friendsLoading, loadMore, mode]);

  useEffect(() => {
    if (!discussionSessionId) {
      setDiscussionSessionOverride(null);
      setDiscussionSessionFetching(false);
      return;
    }
    if (!user) return;
    if (feedItems.some((s) => s.id === discussionSessionId)) {
      setDiscussionSessionOverride(null);
      setDiscussionSessionFetching(false);
      return;
    }
    if (friendsLoading) return;

    let cancelled = false;
    setDiscussionSessionFetching(true);
    void (async () => {
      const loaded = await fetchFeedSessionForDiscussion(discussionSessionId);
      if (cancelled) return;
      setDiscussionSessionFetching(false);
      if (!loaded) {
        toast.error("Impossible d'ouvrir la discussion de cette séance.");
        setDiscussionSessionId(null);
        setDiscussionSessionOverride(null);
        return;
      }
      setDiscussionSessionOverride(loaded);
    })();
    return () => {
      cancelled = true;
    };
  }, [discussionSessionId, user, feedItems, friendsLoading]);

  const discussionSession = useMemo(() => {
    if (!discussionSessionId) return null;
    const fromFeed = feedItems.find((s) => s.id === discussionSessionId);
    if (fromFeed) return fromFeed;
    if (discussionSessionOverride?.id === discussionSessionId) return discussionSessionOverride;
    return null;
  }, [discussionSessionId, feedItems, discussionSessionOverride]);

  const loading = mode === "friends" ? friendsLoading : discoverLoading;

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

  const handleJoinFromFeed = useCallback(
    (sessionId: string) => {
      navigate("/", { state: { openSessionId: sessionId } });
    },
    [navigate],
  );

  const friendLabel = useMemo(() => {
    const n = friendCount ?? 0;
    return `Amis · ${n}`;
  }, [friendCount]);

  const waitingForDiscussionResolve =
    Boolean(discussionSessionId) &&
    !discussionSession &&
    (friendsLoading || discussionSessionFetching);

  if (discussionSessionId && waitingForDiscussionResolve) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 bg-secondary px-6 pb-[calc(env(safe-area-inset-bottom,0)+24px)] pt-[calc(var(--safe-area-top)+24px)]">
        <Loader2 className="h-9 w-9 animate-spin text-primary" aria-hidden />
        <p className="text-center text-ios-subheadline text-muted-foreground">Ouverture de la discussion…</p>
      </div>
    );
  }

  if (discussionSession) {
    return (
      <SessionDiscussionView
        session={discussionSession}
        onBack={() => {
          setDiscussionSessionId(null);
          setDiscussionSessionOverride(null);
        }}
        onAddComment={addComment}
      />
    );
  }

  return (
    <IosFixedPageHeaderShell
      className="flex h-full min-h-0 min-w-0 max-w-full flex-col overflow-x-hidden bg-secondary"
      headerWrapperClassName="shrink-0"
      contentScroll
      scrollClassName="min-h-0 bg-secondary"
      header={
        <div className="min-w-0 bg-secondary pt-[var(--safe-area-top)]">
          <IosPageHeaderBar
            className="py-1.5"
            leadingBack={{ onClick: () => navigate(-1), label: "Retour" }}
            title="Activités"
            titleClassName="text-[17px] text-primary"
          />
          <div className="flex gap-1.5 px-4 pb-1">
            <button
              type="button"
              onClick={() => setMode("friends")}
              className={cn(
                "h-9 shrink-0 rounded-full px-[18px] text-[15px] font-normal tracking-[-0.3px] transition-transform active:scale-95",
                mode === "friends"
                  ? "bg-primary text-primary-foreground"
                  : "border border-primary bg-transparent text-primary",
              )}
            >
              {friendLabel}
            </button>
            <button
              type="button"
              onClick={() => setMode("discover")}
              className={cn(
                "h-9 shrink-0 rounded-full px-[18px] text-[15px] font-normal tracking-[-0.3px] transition-transform active:scale-95",
                mode === "discover"
                  ? "bg-primary text-primary-foreground"
                  : "border border-primary bg-transparent text-primary",
              )}
            >
              Découvrir
            </button>
          </div>
          {mode === "discover" ? (
            <div className="px-4 pb-2 pt-1">
              <DiscoverFilters
                maxDistance={maxDistance}
                setMaxDistance={setMaxDistance}
                selectedActivities={selectedActivities}
                toggleActivity={toggleActivity}
                toggleAllActivities={toggleAllActivities}
              />
            </div>
          ) : null}
        </div>
      }
    >
      <ScrollArea className="h-full min-h-0 min-w-0 flex-1 overflow-x-hidden [&>div>div[style]]:!overflow-y-auto [&_.scrollbar]:hidden [&>div>div+div]:hidden">
        <div className="box-border w-full max-w-full space-y-3.5 px-4 pb-[6.5rem] pt-3.5" data-tutorial="tutorial-feed">
          {mode === "friends" && loading && feedItems.length === 0 ? (
            <div className="flex flex-col gap-3.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="overflow-hidden rounded-[18px] bg-card p-0 dark:bg-card">
                  <div className="flex items-center gap-2.5 p-3.5">
                    <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-muted" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-4 w-1/2 animate-pulse rounded-full bg-muted" />
                      <div className="h-3 w-1/3 animate-pulse rounded-full bg-muted" />
                    </div>
                  </div>
                  <div className="h-[130px] animate-pulse bg-muted/60" />
                  <div className="flex items-center justify-between border-t border-border/50 p-3.5">
                    <div className="h-4 w-2/3 animate-pulse rounded-full bg-muted" />
                    <div className="h-9 w-24 animate-pulse rounded-full bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : mode === "friends" && feedItems.length === 0 ? (
            <div className="mx-auto max-w-md py-6">
              <FeedEmptyState />
            </div>
          ) : mode === "friends" ? (
            <>
              {feedItems.map((s) => {
                const who = s.organizer.display_name || s.organizer.username;
                const loc = shortLocation(s.location_name);
                const title = loc ? `${s.title} · ${loc}` : s.title;
                const live = sessionLikelyLive(s.scheduled_at);
                const tone = toneHexForActivity(s.activity_type);
                return (
                  <div key={s.id} className="space-y-0">
                    <FeedSessionTile
                      who={who}
                      when={renderFriendsWhen(s)}
                      title={title}
                      tone={tone}
                      live={live}
                      actionLabel={live ? "Suivre" : "Rejoindre"}
                      commentLabel="Commenter"
                      locationLat={s.location_lat}
                      locationLng={s.location_lng}
                      avatarUrl={s.organizer.avatar_url || undefined}
                      activityType={s.activity_type}
                      onCardPress={() =>
                        setSelectedFriendsSession({
                          ...s,
                          session_type: s.activity_type,
                          intensity: "moderate",
                          organizer_id: s.organizer.user_id,
                          profiles: {
                            username: s.organizer.username,
                            display_name: s.organizer.display_name,
                            avatar_url: s.organizer.avatar_url || undefined,
                          },
                        })
                      }
                      onActionPress={() => handleJoinFromFeed(s.id)}
                      onCommentPress={() => setDiscussionSessionId(s.id)}
                    />
                  </div>
                );
              })}
              {hasMore ? (
                <div ref={loadMoreRef} className="flex justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                feedItems.length > 0 && (
                  <p className="py-6 text-center text-[13px] text-muted-foreground">Vous êtes à jour !</p>
                )
              )}
            </>
          ) : loading && discoverSessions.length === 0 ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : discoverSessions.length === 0 ? (
            <div className="mx-auto max-w-md py-4">
              <DiscoverEmptyState
                hasLocation={hasLocation}
                onResetFilters={() => {
                  resetFilters();
                  void refreshDiscover();
                }}
              />
            </div>
          ) : (
            discoverSessions.map((s) => {
              const who = s.organizer.display_name || s.organizer.username;
              const loc = shortLocation(s.location_name);
              const title = loc ? `${s.title} · ${loc}` : s.title;
              const live = sessionLikelyLive(s.scheduled_at);
              const tone = toneHexForActivity(s.activity_type);
              return (
                <FeedSessionTile
                  key={s.id}
                  who={who}
                  when={renderDiscoverWhen(s)}
                  title={title}
                  tone={tone}
                  live={live}
                  actionLabel={live ? "Suivre" : "Rejoindre"}
                  locationLat={s.location_lat}
                  locationLng={s.location_lng}
                  avatarUrl={s.organizer.avatar_url || undefined}
                  activityType={s.activity_type}
                  onCardPress={() =>
                    setSelectedDiscoverSession({
                      ...s,
                      session_type: s.activity_type,
                      profiles: {
                        username: s.organizer.username,
                        display_name: s.organizer.display_name,
                        avatar_url: s.organizer.avatar_url || undefined,
                      },
                    })
                  }
                  onActionPress={() => {
                    void joinSession(s);
                  }}
                />
              );
            })
          )}
        </div>
      </ScrollArea>

      <SessionDetailsDialog
        session={selectedDiscoverSession as any}
        onClose={() => setSelectedDiscoverSession(null)}
        onSessionUpdated={() => void refreshDiscover()}
      />

      <SessionDetailsDialog
        session={selectedFriendsSession as any}
        onClose={() => setSelectedFriendsSession(null)}
        onSessionUpdated={() => void refreshFriends()}
      />
    </IosFixedPageHeaderShell>
  );
}
