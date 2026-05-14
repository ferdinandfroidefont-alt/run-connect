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
import { DiscoverNearYouSection } from "@/components/discover/DiscoverNearYouSection";
import { DiscoverLiveMaquetteSection } from "@/components/discover/DiscoverLiveMaquetteSection";
import {
  DiscoverMapFilterSheets,
  type DiscoverFilterPanel,
} from "@/components/discover/DiscoverMapFilterSheets";
import { DiscoverMaquetteSheet } from "@/components/discover/DiscoverMaquetteSheet";
import {
  MaquetteSheetCard,
  MaquetteFilterRow,
  MaquetteFilterRowDivider,
} from "@/components/discover/DiscoverMaquetteFilterParts";
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
  const [discoverFilterPanel, setDiscoverFilterPanel] = useState<DiscoverFilterPanel>(null);
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
                onOpenStyleSheet={() => {
                  setDiscoverStyleSheetOpen(true);
                  setDiscoverFilterPanel(null);
                }}
                onOpenFiltersSheet={() => {
                  setDiscoverFilterPanel("main");
                  setDiscoverStyleSheetOpen(false);
                }}
              />
            </div>

            {!discoverMapFullscreen ? (
              <DiscoverNearYouSection
                sessions={discoverSessions}
                loading={discoverLoading}
                onRowPress={(s) => {
                  if (sessionLikelyLive(s.scheduled_at)) setSelectedSession(discoverToDialog(s));
                  else void joinSession(s);
                }}
              />
            ) : null}
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
            onOpenStyleSheet={() => {
              setDiscoverStyleSheetOpen(true);
              setDiscoverFilterPanel(null);
            }}
            onOpenFiltersSheet={() => {
              setDiscoverFilterPanel("main");
              setDiscoverStyleSheetOpen(false);
            }}
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

      <DiscoverMapFilterSheets
        panel={discoverFilterPanel}
        onSetPanel={setDiscoverFilterPanel}
        maxDistance={maxDistance}
        setMaxDistance={setMaxDistance}
        selectedActivities={selectedActivities}
        toggleActivity={toggleActivity}
        toggleAllActivities={toggleAllActivities}
      />

      <DiscoverMaquetteSheet
        open={discoverStyleSheetOpen}
        onClose={() => setDiscoverStyleSheetOpen(false)}
        title="Style de carte"
        subtitle="Choisis ton type d'affichage"
        titleId="discover-map-style-sheet-title"
      >
        <MaquetteSheetCard>
          {DISCOVER_MAP_PALETTE_ROWS.map((row, i) => (
            <div key={row.id}>
              {i > 0 && <MaquetteFilterRowDivider />}
              <MaquetteFilterRow
                emoji={row.emoji}
                color={row.accent}
                title={row.label}
                subtitle={row.hint}
                selected={discoverMapPaletteId === row.id}
                onClick={() => {
                  setDiscoverMapPaletteId(row.id);
                  setDiscoverStyleSheetOpen(false);
                }}
              />
            </div>
          ))}
        </MaquetteSheetCard>
      </DiscoverMaquetteSheet>
    </>
  );
}
