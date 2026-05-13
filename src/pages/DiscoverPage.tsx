import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFeed, type FeedSession } from "@/hooks/useFeed";
import { useDiscoverFeed } from "@/hooks/useDiscoverFeed";
import type { DiscoverSession } from "@/hooks/useDiscoverFeed";
import { SessionDetailsDialog } from "@/components/SessionDetailsDialog";
import {
  DiscoverChromeShell,
  ACTION_BLUE,
  type DiscoverChromeActiveChip,
} from "@/components/discover/DiscoverChromeShell";
import { DiscoverMapCard } from "@/components/discover/DiscoverMapCard";
import { DiscoverMapMaquetteToolbar } from "@/components/discover/DiscoverMapMaquetteToolbar";
import { DiscoverFeedInlineSection } from "@/components/discover/DiscoverFeedInlineSection";
import { DiscoverLiveMaquetteSection } from "@/components/discover/DiscoverLiveMaquetteSection";
import { DiscoverFilters } from "@/components/feed/DiscoverFilters";
import {
  HomeMapFilterGroupedList,
  HomeMapFilterRow,
  HomeMapFilterSheet,
} from "@/components/map/HomeMapFilterSheet";
import {
  DISCOVER_MAP_3D_PITCH,
  DISCOVER_MAP_PALETTE_ROWS,
  discoverPaletteToStyleUrl,
  type DiscoverMapPaletteId,
} from "@/lib/discoverMapStyle";
import { sessionLikelyLive } from "@/components/feed/FeedSessionTile";

const RouteCreationEmbedded = lazy(() => import("@/pages/RouteCreation"));

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

function feedToDialog(session: FeedSession): Record<string, unknown> {
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

export function DiscoverPage() {
  const { user } = useAuth();
  const [view, setView] = useState<DiscoverChromeActiveChip>("carte");
  const [feedSubTab, setFeedSubTab] = useState<"amis" | "decouvrir">("amis");
  const [friendCount, setFriendCount] = useState<number | null>(null);
  const [selectedSession, setSelectedSession] = useState<Record<string, unknown> | null>(null);
  const [discoverMapFullscreen, setDiscoverMapFullscreen] = useState(false);
  const [liveMapFullscreen, setLiveMapFullscreen] = useState(false);
  const [discoverMapPaletteId, setDiscoverMapPaletteId] = useState<DiscoverMapPaletteId>("standard");
  const [discoverFilterSheetOpen, setDiscoverFilterSheetOpen] = useState(false);
  const [discoverStyleSheetOpen, setDiscoverStyleSheetOpen] = useState(false);

  const discoverMapStyleUrl = useMemo(() => discoverPaletteToStyleUrl(discoverMapPaletteId), [discoverMapPaletteId]);
  const discoverMapPitch = discoverMapPaletteId === "standard3d" ? DISCOVER_MAP_3D_PITCH : 0;

  const {
    feedItems,
    loading: friendsLoading,
    hasMore,
    loadMore,
    refresh: refreshFeed,
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

  const liveSessions = useMemo(
    () => discoverSessions.filter((s) => sessionLikelyLive(s.scheduled_at)),
    [discoverSessions],
  );

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

  const onPullRefresh = useCallback(async () => {
    await Promise.allSettled([refreshFeed(), refreshDiscover()]);
  }, [refreshFeed, refreshDiscover]);

  const onPin = useCallback((session: DiscoverSession) => {
    setSelectedSession(discoverToDialog(session));
  }, []);

  return (
    <>
      <DiscoverChromeShell
        activeChip={view}
        onChipPress={setView}
        enablePullRefresh
        onPullRefresh={onPullRefresh}
      >
        {view === "carte" ? (
          <>
            <div
              className={`relative mt-4 overflow-hidden rounded-2xl ring-1 ring-black/[0.06] transition-all duration-300 ease-out ${
                discoverMapFullscreen ? "h-[calc(100vh-220px)]" : "h-[260px]"
              }`}
            >
              <DiscoverMapCard
                sessions={discoverSessions}
                mapStyleUrl={discoverMapStyleUrl}
                mapPitch={discoverMapPitch}
                onSessionMarkerClick={onPin}
                className="h-full min-h-0"
              />
              <DiscoverMapMaquetteToolbar
                fullscreen={discoverMapFullscreen}
                onToggleFullscreen={() => setDiscoverMapFullscreen((v) => !v)}
                onOpenStyleSheet={() => setDiscoverStyleSheetOpen(true)}
                onOpenFiltersSheet={() => setDiscoverFilterSheetOpen(true)}
              />
            </div>

          </>
        ) : null}

        {view === "feed" ? (
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
            onOpenFriendSession={(s) => setSelectedSession(feedToDialog(s))}
          />
        ) : null}

        {view === "live" ? (
          <DiscoverLiveMaquetteSection
            liveSessions={liveSessions}
            discoverLoading={discoverLoading}
            mapStyleUrl={discoverMapStyleUrl}
            mapPitch={discoverMapPitch}
            fullscreen={liveMapFullscreen}
            onToggleFullscreen={() => setLiveMapFullscreen((v) => !v)}
            onOpenStyleSheet={() => setDiscoverStyleSheetOpen(true)}
            onOpenFiltersSheet={() => setDiscoverFilterSheetOpen(true)}
            onOpenSession={onPin}
            joinSession={joinSession}
          />
        ) : null}

        {view === "itineraires" ? (
          <Suspense
            fallback={
              <div className="flex justify-center py-16" aria-busy="true" aria-label="Chargement">
                <div
                  className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
                  style={{ borderColor: `${ACTION_BLUE}44`, borderTopColor: ACTION_BLUE }}
                />
              </div>
            }
          >
            <RouteCreationEmbedded embedDiscover />
          </Suspense>
        ) : null}
      </DiscoverChromeShell>

      <SessionDetailsDialog
        session={selectedSession as never}
        onClose={() => setSelectedSession(null)}
        onSessionUpdated={() => {
          void refreshDiscover();
          void refreshFeed();
        }}
      />

      <HomeMapFilterSheet
        open={discoverFilterSheetOpen}
        onClose={() => setDiscoverFilterSheetOpen(false)}
        title="Filtres"
        description="Affine ta recherche de séances"
        titleId="discover-map-filters-sheet-title"
        variant="tall"
      >
        <DiscoverFilters
          maxDistance={maxDistance}
          setMaxDistance={setMaxDistance}
          selectedActivities={selectedActivities}
          toggleActivity={toggleActivity}
          toggleAllActivities={toggleAllActivities}
        />
      </HomeMapFilterSheet>

      <HomeMapFilterSheet
        open={discoverStyleSheetOpen}
        onClose={() => setDiscoverStyleSheetOpen(false)}
        title="Style de carte"
        description="Choisis ton type d'affichage"
        titleId="discover-map-style-sheet-title"
      >
        <HomeMapFilterGroupedList>
          {DISCOVER_MAP_PALETTE_ROWS.map((row) => (
            <HomeMapFilterRow
              key={row.id}
              label={row.label}
              hint={row.hint}
              selected={discoverMapPaletteId === row.id}
              onClick={() => {
                setDiscoverMapPaletteId(row.id);
                setDiscoverStyleSheetOpen(false);
              }}
              leading={
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] text-[18px] leading-none"
                  style={{ backgroundColor: `${row.accent}22` }}
                  aria-hidden
                >
                  {row.emoji}
                </span>
              }
            />
          ))}
        </HomeMapFilterGroupedList>
      </HomeMapFilterSheet>
    </>
  );
}
