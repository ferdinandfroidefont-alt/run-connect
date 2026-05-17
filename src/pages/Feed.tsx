import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFeed, type FeedSession } from "@/hooks/useFeed";
import { useDiscoverFeed } from "@/hooks/useDiscoverFeed";
import type { DiscoverSession } from "@/hooks/useDiscoverFeed";
import { DiscoverChromeShell } from "@/components/discover/DiscoverChromeShell";
import { DiscoverFeedInlineSection } from "@/components/discover/DiscoverFeedInlineSection";
import { SessionDetailsDialog } from "@/components/SessionDetailsDialog";
import { fetchFeedSessionForDiscussion, SessionDiscussionView } from "@/components/feed/SessionDiscussionView";
import { toast } from "sonner";

function discoverToDialog(session: DiscoverSession): Record<string, unknown> {
  return {
    ...session,
    session_type: session.activity_type,
    profiles: {
      username: session.organizer.username,
      display_name: session.organizer.display_name,
      avatar_url: session.organizer.avatar_url,
    },
  };
}

function feedSessionToDialog(session: FeedSession): Record<string, unknown> {
  return {
    ...session,
    session_type: session.activity_type,
    intensity: "moderate",
    organizer_id: session.organizer.user_id,
    profiles: {
      username: session.organizer.username,
      display_name: session.organizer.display_name,
      avatar_url: session.organizer.avatar_url || undefined,
    },
  };
}

export default function Feed() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [feedSubTab, setFeedSubTab] = useState<"amis" | "decouvrir">("amis");
  const [friendCount, setFriendCount] = useState<number | null>(null);
  const [selectedSession, setSelectedSession] = useState<Record<string, unknown> | null>(null);
  const [discussionSessionId, setDiscussionSessionId] = useState<string | null>(null);
  const [discussionSessionOverride, setDiscussionSessionOverride] = useState<FeedSession | null>(null);
  const [discussionSessionFetching, setDiscussionSessionFetching] = useState(false);

  const {
    feedItems,
    loading: friendsLoading,
    hasMore,
    loadMore,
    refresh: refreshFeed,
    addComment,
  } = useFeed();

  const {
    sessions: discoverSessions,
    loading: discoverLoading,
    refresh: refreshDiscover,
    joinSession,
    maxDistance,
    setMaxDistance,
    selectedActivities,
    toggleActivity,
    toggleAllActivities,
  } = useDiscoverFeed();

  useEffect(() => {
    if (!user?.id) return;
    void (async () => {
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
    setFeedSubTab("amis");
    setDiscussionSessionFetching(true);
    setDiscussionSessionId(st.openFeedCommentSessionId);
    navigate(`${location.pathname}${location.search}`, { replace: true, state: {} });
  }, [location.state, location.pathname, location.search, navigate]);

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

  const waitingForDiscussionResolve =
    Boolean(discussionSessionId) &&
    !discussionSession &&
    (friendsLoading || discussionSessionFetching);

  const onSessionUpdated = useCallback(() => {
    void refreshDiscover();
    void refreshFeed();
  }, [refreshDiscover, refreshFeed]);

  if (discussionSessionId && waitingForDiscussionResolve) {
    return (
      <div className="fixed inset-0 z-[140] flex min-h-0 w-full min-w-0 flex-col bg-secondary">
        <div className="flex h-full min-h-0 w-full flex-col items-center justify-center gap-4 bg-secondary px-6 pb-[calc(env(safe-area-inset-bottom,0)+24px)] pt-[calc(var(--safe-area-top)+24px)]">
          <Loader2 className="h-9 w-9 animate-spin text-primary" aria-hidden />
          <p className="text-center text-ios-subheadline text-muted-foreground">Ouverture de la discussion…</p>
        </div>
      </div>
    );
  }

  if (discussionSession) {
    return (
      <div className="fixed inset-0 z-[140] flex min-h-0 w-full min-w-0 flex-col bg-background">
        <SessionDiscussionView
          session={discussionSession}
          onBack={() => {
            setDiscussionSessionId(null);
            setDiscussionSessionOverride(null);
          }}
          onAddComment={addComment}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <DiscoverChromeShell activeChip="feed">
        <DiscoverFeedInlineSection
          subTab={feedSubTab}
          onSubTabChange={setFeedSubTab}
          friendCount={friendCount}
          feedItems={feedItems}
          friendsLoading={friendsLoading}
          hasMore={hasMore}
          loadMore={loadMore}
          discoverSessions={discoverSessions}
          discoverLoading={discoverLoading}
          maxDistance={maxDistance}
          setMaxDistance={setMaxDistance}
          selectedActivities={selectedActivities}
          toggleActivity={toggleActivity}
          toggleAllActivities={toggleAllActivities}
          joinSession={joinSession}
          onOpenDiscoverSession={(s) => setSelectedSession(discoverToDialog(s))}
          onOpenFriendSession={(s) => setSelectedSession(feedSessionToDialog(s))}
        />
      </DiscoverChromeShell>
      <SessionDetailsDialog
        session={selectedSession as never}
        onClose={() => setSelectedSession(null)}
        onSessionUpdated={onSessionUpdated}
      />
    </div>
  );
}
