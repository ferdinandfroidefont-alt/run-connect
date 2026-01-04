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
import { Loader2, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Feed() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<FeedMode>('friends');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  
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

  const handleJoinSession = (sessionId: string) => {
    navigate('/', { state: { openSessionId: sessionId } });
  };

  const handleViewComments = (sessionId: string) => {
    navigate('/', { state: { openSessionId: sessionId, focusComments: true } });
  };

  const loading = mode === 'friends' ? friendsLoading : discoverLoading;

  return (
    <div className="min-h-screen bg-secondary pb-24">
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

      {/* Pull to Refresh - iOS Style */}
      <div className="flex justify-center py-3">
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 text-[13px] text-muted-foreground active:text-foreground bg-card border border-border rounded-full transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Actualisation...' : 'Actualiser'}
        </button>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto">
        {mode === 'friends' ? (
          // Friends Feed
          <>
            {loading && feedItems.length === 0 ? (
              // Loading skeleton
              <div className="space-y-0">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="border-b border-border p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-secondary animate-pulse" />
                      <div className="space-y-1.5">
                        <div className="h-3 w-24 bg-secondary rounded animate-pulse" />
                        <div className="h-2 w-16 bg-secondary rounded animate-pulse" />
                      </div>
                    </div>
                    <div className="h-4 w-3/4 bg-secondary rounded animate-pulse" />
                    <div className="h-32 bg-secondary rounded-[10px] animate-pulse" />
                  </div>
                ))}
              </div>
            ) : feedItems.length === 0 ? (
              <FeedEmptyState />
            ) : (
              <>
                {feedItems.map((session) => (
                  <FeedCard
                    key={session.id}
                    session={session}
                    onLike={likeSession}
                    onUnlike={unlikeSession}
                    onAddComment={addComment}
                    onJoinSession={handleJoinSession}
                    onViewComments={handleViewComments}
                  />
                ))}
              </>
            )}

            {/* Infinite scroll trigger */}
            {hasMore && feedItems.length > 0 && (
              <div ref={observerTarget} className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}

            {/* End of feed */}
            {!hasMore && feedItems.length > 0 && (
              <div className="py-8 text-center">
                <p className="text-[13px] text-muted-foreground">
                  Vous êtes à jour !
                </p>
              </div>
            )}
          </>
        ) : (
          // Discover Feed
          <>
            {loading ? (
              <div className="p-4">
                <div className="bg-card border border-border rounded-[10px] p-8 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-[15px] text-muted-foreground">Recherche...</p>
                </div>
              </div>
            ) : discoverSessions.length === 0 ? (
              <div className="py-4">
                <DiscoverEmptyState 
                  hasLocation={hasLocation} 
                  onResetFilters={resetFilters} 
                />
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {discoverSessions.map((session) => (
                  <DiscoverCard
                    key={session.id}
                    session={session}
                    onJoin={joinSession}
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
    </div>
  );
}
