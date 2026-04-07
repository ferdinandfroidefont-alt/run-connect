import { useEffect, useRef, useCallback, useState, lazy, Suspense } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2, RefreshCw } from "lucide-react";
import { useFeed } from "@/hooks/useFeed";
import { useDiscoverFeed } from "@/hooks/useDiscoverFeed";
import { FeedCard } from "@/components/feed/FeedCard";
import { FeedHeader, type FeedMode } from "@/components/feed/FeedHeader";
import { FeedEmptyState } from "@/components/feed/FeedEmptyState";
import { DiscoverFilters } from "@/components/feed/DiscoverFilters";
import { DiscoverCard } from "@/components/feed/DiscoverCard";
import { DiscoverEmptyState } from "@/components/feed/DiscoverEmptyState";
import { ProfileDialog } from "@/components/ProfileDialog";
import { SessionDetailsDialog } from "@/components/SessionDetailsDialog";
import { SessionStoriesStrip } from "@/components/stories/SessionStoriesStrip";
import { SessionStoryDialog } from "@/components/stories/SessionStoryDialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

const SettingsDialog = lazy(() =>
  import("@/components/SettingsDialog").then((m) => ({ default: m.SettingsDialog })),
);

type Props = {
  /** 1 = demi, 2 = quasi plein — pour le padding safe du header */
  sheetSnap: 1 | 2;
  onBrandClick: () => void;
  scrollClassName?: string;
};

/**
 * Contenu Feed dans la bottom sheet accueil (même logique que l’ancienne page /feed).
 */
export function HomeFeedSheetContent({ sheetSnap, onBrandClick, scrollClassName }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<FeedMode>("friends");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [settingsDialogFocus, setSettingsDialogFocus] = useState("");
  const [selectedDiscoverSession, setSelectedDiscoverSession] = useState<Record<string, unknown> | null>(
    null,
  );
  const [pullDistance, setPullDistance] = useState(0);
  const [showCreateStoryDialog, setShowCreateStoryDialog] = useState(false);
  const [scheduledSessions, setScheduledSessions] = useState<Array<{ id: string; title: string; scheduled_at: string; location_name: string }>>([]);
  const [storyAuthorId, setStoryAuthorId] = useState<string | null>(null);
  const touchStartY = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const {
    feedItems,
    loading: friendsLoading,
    hasMore,
    loadMore,
    refresh: refreshFriends,
    likeSession,
    unlikeSession,
    addComment,
  } = useFeed();

  const {
    sessions: discoverSessions,
    loading: discoverLoading,
    hasLocation,
    maxDistance,
    setMaxDistance,
    selectedActivities,
    toggleActivity,
    toggleAllActivities,
    resetFilters,
    joinSession,
    refresh: refreshDiscover,
  } = useDiscoverFeed();

  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const st = location.state as {
      openProfileDialog?: boolean;
      openSettingsDialog?: boolean;
      settingsFocus?: string;
    } | null;
    if (!st?.openProfileDialog && !st?.openSettingsDialog) return;
    if (st.openProfileDialog) setShowProfileDialog(true);
    if (st.openSettingsDialog) {
      setShowSettingsDialog(true);
      setSettingsDialogFocus(st.settingsFocus || "");
    }
    navigate(`${location.pathname}${location.search}`, { replace: true, state: {} });
  }, [location.state, location.pathname, location.search, navigate]);

  useEffect(() => {
    if (mode !== "friends") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !friendsLoading) {
          loadMore();
        }
      },
      { threshold: 0.1 },
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) observer.observe(currentTarget);

    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
    };
  }, [hasMore, friendsLoading, loadMore, mode]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    if (mode === "friends") await refreshFriends();
    else await refreshDiscover();
    window.setTimeout(() => setIsRefreshing(false), 450);
  }, [mode, refreshFriends, refreshDiscover]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (isRefreshing) return;
      const container = scrollContainerRef.current;
      if (container && container.scrollTop > 0) return;
      const delta = e.touches[0].clientY - touchStartY.current;
      if (delta > 0) setPullDistance(Math.min(delta * 0.4, 80));
    },
    [isRefreshing],
  );

  const handleTouchEnd = useCallback(() => {
    if (pullDistance > 50) void handleRefresh();
    setPullDistance(0);
  }, [pullDistance, handleRefresh]);

  const handleJoinSession = (sessionId: string) => {
    navigate("/", { state: { openSessionId: sessionId } });
  };

  const loadSchedulableSessions = useCallback(async () => {
    if (!user?.id) return;
    const now = new Date().toISOString();
    const { data } = await supabase
      .from("sessions")
      .select("id, title, scheduled_at, location_name")
      .eq("organizer_id", user.id)
      .gt("scheduled_at", now)
      .order("scheduled_at", { ascending: true })
      .limit(30);
    setScheduledSessions((data ?? []) as Array<{ id: string; title: string; scheduled_at: string; location_name: string }>);
  }, [user?.id]);

  const publishSessionStory = useCallback(
    async (sessionId: string) => {
      if (!user?.id) return;
      const { error } = await (supabase as any).from("session_stories").insert({
        author_id: user.id,
        session_id: sessionId,
      });
      if (error) {
        toast({ title: "Erreur", description: "Impossible de publier la story", variant: "destructive" });
        return;
      }
      toast({ title: "Story publiee", description: "Ta seance est visible pendant 24h." });
      setShowCreateStoryDialog(false);
      setStoryAuthorId(user.id);
    },
    [user?.id, toast]
  );

  const loading = mode === "friends" ? friendsLoading : discoverLoading;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-secondary/80 dark:bg-black/85">
      <FeedHeader
        layoutVariant="sheet"
        sheetSnap={sheetSnap}
        onBrandClick={onBrandClick}
        onProfileClick={() => setShowProfileDialog(true)}
        onSettingsClick={() => setShowSettingsDialog(true)}
        mode={mode}
        onModeChange={setMode}
      />

      {mode === "discover" && (
        <div className="shrink-0 border-b border-border/40 bg-secondary/80 dark:bg-black/85">
          <DiscoverFilters
            maxDistance={maxDistance}
            setMaxDistance={setMaxDistance}
            selectedActivities={selectedActivities}
            toggleActivity={toggleActivity}
            toggleAllActivities={toggleAllActivities}
          />
        </div>
      )}

      {mode === "friends" && <div className="h-px shrink-0 bg-border/50" />}

      <div
        ref={scrollContainerRef}
        className={cn("ios-scroll-region min-h-0 flex-1 overflow-y-auto overscroll-y-contain", scrollClassName)}
        data-tutorial="tutorial-feed"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {(pullDistance > 0 || isRefreshing) && (
          <div
            className="flex justify-center overflow-hidden transition-all"
            style={{ height: isRefreshing ? 40 : pullDistance * 0.5 }}
          >
            <RefreshCw
              className={`h-5 w-5 text-muted-foreground ${isRefreshing ? "animate-spin" : ""}`}
              style={{
                opacity: isRefreshing ? 1 : Math.min(pullDistance / 50, 1),
                transform: `rotate(${pullDistance * 3}deg)`,
              }}
            />
          </div>
        )}

        <div className="mx-auto max-w-2xl pb-ios-4">
          {mode === "friends" ? (
            <>
              <div className="px-ios-3 pt-ios-2">
                <div className="ios-card overflow-hidden border border-border/60">
                  <div className="flex items-center justify-between px-4 pt-3">
                    <p className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Stories
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        void loadSchedulableSessions();
                      }}
                      className="text-[12px] font-medium text-primary"
                    >
                      Actualiser
                    </button>
                  </div>
                  <SessionStoriesStrip
                    currentUserId={user?.id ?? null}
                    onOpenStory={(authorId) => setStoryAuthorId(authorId)}
                    onCreateStory={() => {
                      void loadSchedulableSessions();
                      setShowCreateStoryDialog(true);
                    }}
                  />
                </div>
              </div>

              {loading && feedItems.length === 0 ? (
                <div className="space-y-ios-3 px-ios-3 pt-ios-2">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="ios-card space-y-ios-3 p-ios-4 animate-fade-in"
                      style={{ animationDelay: `${i * 100}ms`, animationFillMode: "both" }}
                    >
                      <div className="flex items-center gap-ios-3">
                        <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                        <div className="flex-1 space-y-ios-1">
                          <div className="h-3.5 w-28 animate-pulse rounded-full bg-muted" />
                          <div className="h-2.5 w-16 animate-pulse rounded-full bg-muted" />
                        </div>
                        <div className="h-6 w-16 animate-pulse rounded-full bg-muted" />
                      </div>
                      <div className="h-5 w-3/4 animate-pulse rounded-full bg-muted" />
                      <div className="h-32 animate-pulse rounded-ios-md bg-muted" />
                    </div>
                  ))}
                </div>
              ) : feedItems.length === 0 ? (
                <FeedEmptyState />
              ) : (
                <div className="space-y-ios-3 px-ios-3 pb-ios-2 pt-ios-1">
                  {feedItems.map((session, index) => (
                    <FeedCard
                      key={session.id}
                      session={session}
                      onLike={likeSession}
                      onUnlike={unlikeSession}
                      onAddComment={addComment}
                      onJoinSession={handleJoinSession}
                      index={index}
                    />
                  ))}
                </div>
              )}

              {hasMore && feedItems.length > 0 && (
                <div ref={observerTarget} className="flex justify-center py-ios-6">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}

              {!hasMore && feedItems.length > 0 && (
                <div className="py-8 text-center">
                  <p className="text-ios-footnote text-muted-foreground">Vous êtes à jour ! ✨</p>
                </div>
              )}
            </>
          ) : loading ? (
            <div className="py-ios-4">
              <div className="ios-card flex flex-col items-center justify-center gap-ios-3 p-ios-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-ios-subheadline text-muted-foreground">Recherche...</p>
              </div>
            </div>
          ) : discoverSessions.length === 0 ? (
            <div className="py-ios-4">
              <DiscoverEmptyState hasLocation={hasLocation} onResetFilters={resetFilters} />
            </div>
          ) : (
            <div className="space-y-ios-3 px-ios-3 py-ios-4">
              {discoverSessions.map((session, index) => (
                <DiscoverCard
                  key={session.id}
                  session={session}
                  onJoin={joinSession}
                  onCardClick={(s) =>
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
                  index={index}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ProfileDialog open={showProfileDialog} onOpenChange={setShowProfileDialog} />

      <Suspense fallback={null}>
        <SettingsDialog
          open={showSettingsDialog}
          onOpenChange={(open) => {
            setShowSettingsDialog(open);
            if (!open) setSettingsDialogFocus("");
          }}
          initialSearch={settingsDialogFocus}
        />
      </Suspense>

      <SessionDetailsDialog
        session={selectedDiscoverSession as any}
        onClose={() => setSelectedDiscoverSession(null)}
        onSessionUpdated={() => refreshDiscover()}
      />

      <Dialog open={showCreateStoryDialog} onOpenChange={setShowCreateStoryDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Partager une seance en story</DialogTitle>
            <DialogDescription>Selectionne une seance programmee. La story reste active 24h.</DialogDescription>
          </DialogHeader>
          <div className="max-h-80 space-y-2 overflow-auto">
            {scheduledSessions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => void publishSessionStory(s.id)}
                className="w-full rounded-ios-md border px-3 py-2 text-left transition-colors hover:bg-secondary"
              >
                <p className="text-sm font-semibold">{s.title}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(s.scheduled_at), "EEEE d MMMM 'a' HH:mm", { locale: fr })} - {s.location_name}
                </p>
              </button>
            ))}
            {scheduledSessions.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">Aucune seance programmee a partager.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <SessionStoryDialog
        open={!!storyAuthorId}
        onOpenChange={(open) => {
          if (!open) setStoryAuthorId(null);
        }}
        authorId={storyAuthorId}
        viewerUserId={user?.id ?? null}
      />
    </div>
  );
}
