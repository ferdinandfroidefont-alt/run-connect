import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFeed, type FeedSession } from "@/hooks/useFeed";
import { useDiscoverFeed } from "@/hooks/useDiscoverFeed";
import type { DiscoverSession } from "@/hooks/useDiscoverFeed";
import { SessionDetailsDialog } from "@/components/SessionDetailsDialog";
import {
  DiscoverChromeShell,
  type DiscoverChromeActiveChip,
} from "@/components/discover/DiscoverChromeShell";
import { DiscoverMapCard } from "@/components/discover/DiscoverMapCard";
import { DiscoverMapMaquetteToolbar } from "@/components/discover/DiscoverMapMaquetteToolbar";
import {
  FeedActivitiesMaquetteSynced,
  type FeedActivitiesFeedsModel,
} from "@/components/feed/FeedActivitiesMaquette";
import { DiscoverFriendsSessionsSection } from "@/components/discover/DiscoverFriendsSessionsSection";
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
import { sessionIsPast, sessionLikelyLive } from "@/components/feed/FeedSessionTile";

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

export function DiscoverPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<DiscoverChromeActiveChip>("carte");
  const [selectedSession, setSelectedSession] = useState<Record<string, unknown> | null>(null);
  const [discoverMapFullscreen, setDiscoverMapFullscreen] = useState(false);
  const [liveMapFullscreen, setLiveMapFullscreen] = useState(false);
  const [discoverMapPaletteId, setDiscoverMapPaletteId] = useState<DiscoverMapPaletteId>("terrain");
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
    hasLocation,
    resetFilters,
  } = useDiscoverFeed();

  const liveSessions = useMemo(
    () => discoverSessions.filter((s) => sessionLikelyLive(s.scheduled_at)),
    [discoverSessions],
  );

  const feedActivitiesFeeds = useMemo<FeedActivitiesFeedsModel>(
    () => ({
      feedItems,
      friendsLoading,
      hasMore,
      loadMore,
      refreshFriends: refreshFeed,
      addComment,
      discoverSessions,
      discoverLoading,
      hasLocation,
      maxDistance,
      setMaxDistance,
      selectedActivities,
      toggleActivity,
      toggleAllActivities,
      joinSession,
      refreshDiscover,
      resetFilters,
    }),
    [
      feedItems,
      friendsLoading,
      hasMore,
      loadMore,
      refreshFeed,
      addComment,
      discoverSessions,
      discoverLoading,
      hasLocation,
      maxDistance,
      setMaxDistance,
      selectedActivities,
      toggleActivity,
      toggleAllActivities,
      joinSession,
      refreshDiscover,
      resetFilters,
    ],
  );

  const onPullRefresh = useCallback(async () => {
    await Promise.allSettled([refreshFeed(), refreshDiscover()]);
  }, [refreshFeed, refreshDiscover]);

  const onPin = useCallback((session: DiscoverSession) => {
    setSelectedSession(discoverToDialog(session));
  }, []);

  const onChipPress = useCallback(
    (chip: DiscoverChromeActiveChip) => {
      /** Mapbox/WebGL peut planter sous le `translate3d` du swipe d’onglets — écran dédié hors transform. */
      if (chip === "itineraires") {
        navigate("/route-create");
        return;
      }
      setView(chip);
    },
    [navigate],
  );

  return (
    <>
      <DiscoverChromeShell
        activeChip={view}
        onChipPress={onChipPress}
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
              <DiscoverFriendsSessionsSection
                sessions={feedItems}
                loading={friendsLoading}
                hasMore={hasMore}
                loadMore={loadMore}
                onRowPress={(s) => {
                  if (sessionLikelyLive(s.scheduled_at) || sessionIsPast(s.scheduled_at)) {
                    setSelectedSession(feedSessionToDialog(s));
                  } else {
                    navigate("/", { state: { openSessionId: s.id } });
                  }
                }}
              />
            ) : null}
          </>
        ) : null}

        {view === "feed" ? (
          <FeedActivitiesMaquetteSynced embeddedInDiscoverChrome feeds={feedActivitiesFeeds} />
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
