import { useEffect, useRef, useCallback, useState } from 'react';
import { useFeed } from '@/hooks/useFeed';
import { useDiscoverFeed } from '@/hooks/useDiscoverFeed';
import { FeedCard } from '@/components/feed/FeedCard';
import { FeedHeader, FeedMode } from '@/components/feed/FeedHeader';
import { FeedEmptyState } from '@/components/feed/FeedEmptyState';
import { DiscoverFilters } from '@/components/feed/DiscoverFilters';
import { DiscoverCard } from '@/components/feed/DiscoverCard';
import { DiscoverEmptyState } from '@/components/feed/DiscoverEmptyState';
import { ProfileDialog } from '@/components/ProfileDialog';
import { SessionDetailsDialog } from '@/components/SessionDetailsDialog';
import { Loader2, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { DiscoverSession } from '@/hooks/useDiscoverFeed';

export default function Feed() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<FeedMode>('friends');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [selectedDiscoverSession, setSelectedDiscoverSession] = useState<any>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Friends feed hook
  const {
    feedItems,
    loading: friendsLoading,
    hasMore,
    loadMore,
    refresh: refreshFriends,
    likeSession,
    unlikeSession,
    addComment
  } = useFeed();

  // Discover feed hook
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
    refresh: refreshDiscover
  } = useDiscoverFeed();

  const observerTarget = useRef<HTMLDivElement>(null);

  // Infinite scroll observer (only for friends mode)
  useEffect(() => {
    if (mode !== 'friends') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !friendsLoading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, friendsLoading, loadMore, mode]);

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    if (mode === 'friends') {
      await refreshFriends();
    } else {
      await refreshDiscover();
    }
    setTimeout(() => setIsRefreshing(false), 500);
  }, [mode, refreshFriends, refreshDiscover]);

  // Pull-to-refresh touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isRefreshing) return;
    const container = scrollContainerRef.current;
    if (container && container.scrollTop > 0) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0) {
      setPullDistance(Math.min(delta * 0.4, 80));
    }
  }, [isRefreshing]);

  const handleTouchEnd = useCallback(() => {
    if (pullDistance > 50) {
      handleRefresh();
    }
    setPullDistance(0);
  }, [pullDistance, handleRefresh]);

  const handleJoinSession = (sessionId: string) => {
    navigate('/', { state: { openSessionId: sessionId } });
  };

  const loading = mode === 'friends' ? friendsLoading : discoverLoading;

  return (
    <div
      ref={scrollContainerRef}
      className="h-full bg-secondary overflow-y-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header with Mode Selector */}
      <FeedHeader 
        onSearch={() => navigate('/search')} 
        onProfileClick={() => setShowProfileDialog(true)}
        mode={mode}
        onModeChange={setMode}
      />

      {/* Discover Filters (only in discover mode) */}
      {mode === 'discover' && (
        <DiscoverFilters
          maxDistance={maxDistance}
          setMaxDistance={setMaxDistance}
          selectedActivities={selectedActivities}
          toggleActivity={toggleActivity}
          toggleAllActivities={toggleAllActivities}
        />
      )}

      {/* Separator (only for friends mode) */}
      {mode === 'friends' && <div className="h-px bg-border" />}

      {/* Pull to Refresh - iOS Spinner */}
      {(pullDistance > 0 || isRefreshing) && (
        <div className="flex justify-center overflow-hidden transition-all" style={{ height: isRefreshing ? 40 : pullDistance * 0.5 }}>
          <RefreshCw
            className={`h-5 w-5 text-muted-foreground ${isRefreshing ? 'animate-spin' : ''}`}
            style={{ opacity: isRefreshing ? 1 : Math.min(pullDistance / 50, 1), transform: `rotate(${pullDistance * 3}deg)` }}
          />
        </div>
      )}

      {/* Content */}
      <div className="max-w-2xl mx-auto">
        {mode === 'friends' ? (
          // Friends Feed
          <>
            {loading && feedItems.length === 0 ? (
              // Skeleton loaders
              <div className="space-y-ios-3 pt-ios-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="ios-surface rounded-ios-lg bg-card p-ios-4 space-y-ios-3 animate-fade-in" style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'both' }}>
                    <div className="flex items-center gap-ios-3">
                      <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                      <div className="space-y-ios-1 flex-1">
                        <div className="h-3.5 w-28 bg-muted rounded-full animate-pulse" />
                        <div className="h-2.5 w-16 bg-muted rounded-full animate-pulse" />
                      </div>
                      <div className="h-6 w-16 bg-muted rounded-full animate-pulse" />
                    </div>
                    <div className="h-5 w-3/4 bg-muted rounded-full animate-pulse" />
                    <div className="flex gap-ios-3">
                      <div className="h-4 w-24 bg-muted rounded-full animate-pulse" />
                      <div className="h-4 w-16 bg-muted rounded-full animate-pulse" />
                    </div>
                    <div className="h-12 bg-muted rounded-ios-md animate-pulse" />
                    <div className="h-32 bg-muted rounded-ios-md animate-pulse" />
                  </div>
                ))}
              </div>
            ) : feedItems.length === 0 ? (
              <FeedEmptyState />
            ) : (
              <div className="pt-ios-1">
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

            {/* Infinite scroll trigger */}
            {hasMore && feedItems.length > 0 && (
              <div ref={observerTarget} className="flex justify-center py-ios-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}

            {/* End of feed */}
            {!hasMore && feedItems.length > 0 && (
              <div className="py-8 text-center">
                <p className="text-ios-footnote text-muted-foreground">
                  Vous êtes à jour ! ✨
                </p>
              </div>
            )}
          </>
        ) : (
          // Discover Feed
          <>
            {loading ? (
              <div className="py-ios-4">
                <div className="ios-surface rounded-ios-lg p-8 flex flex-col items-center justify-center gap-ios-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-ios-subheadline text-muted-foreground">Recherche...</p>
                </div>
              </div>
            ) : discoverSessions.length === 0 ? (
              <div className="py-ios-4">
                <DiscoverEmptyState 
                  hasLocation={hasLocation} 
                  onResetFilters={resetFilters} 
                />
              </div>
            ) : (
              <div className="py-ios-4 space-y-ios-3">
                {discoverSessions.map((session, index) => (
                  <DiscoverCard
                    key={session.id}
                    session={session}
                    onJoin={joinSession}
                    onCardClick={(s) => setSelectedDiscoverSession({
                      ...s,
                      session_type: s.activity_type,
                      profiles: {
                        username: s.organizer.username,
                        display_name: s.organizer.display_name,
                        avatar_url: s.organizer.avatar_url || undefined
                      }
                    })}
                    index={index}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Profile Dialog */}
      <ProfileDialog 
        open={showProfileDialog} 
        onOpenChange={setShowProfileDialog} 
      />

      {/* Session Details Dialog */}
      <SessionDetailsDialog
        session={selectedDiscoverSession}
        onClose={() => setSelectedDiscoverSession(null)}
        onSessionUpdated={() => refreshDiscover()}
      />
    </div>
  );
}
