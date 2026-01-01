import { useEffect, useRef, useCallback, useState } from 'react';
import { useFeed } from '@/hooks/useFeed';
import { FeedCard } from '@/components/feed/FeedCard';
import { FeedHeader } from '@/components/feed/FeedHeader';
import { StoriesCarousel } from '@/components/feed/StoriesCarousel';
import { FeedEmptyState } from '@/components/feed/FeedEmptyState';
import { Loader2, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Feed() {
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const {
    feedItems,
    loading,
    hasMore,
    loadMore,
    refresh,
    likeSession,
    unlikeSession,
    addComment
  } = useFeed();

  const observerTarget = useRef<HTMLDivElement>(null);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
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
  }, [hasMore, loading, loadMore]);

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refresh();
    setTimeout(() => setIsRefreshing(false), 500);
  }, [refresh]);

  const handleJoinSession = (sessionId: string) => {
    navigate('/', { state: { openSessionId: sessionId } });
  };

  const handleViewComments = (sessionId: string) => {
    navigate('/', { state: { openSessionId: sessionId, focusComments: true } });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Top spacer for status bar */}
      <div className="w-full h-6 bg-background flex-shrink-0" />
      
      {/* Header */}
      <FeedHeader onSearch={() => navigate('/search')} />

      {/* Stories/Suggestions Carousel */}
      <StoriesCarousel />

      {/* Separator */}
      <div className="h-px bg-border" />

      {/* Pull to Refresh */}
      <div className="flex justify-center py-3">
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 text-[13px] text-muted-foreground active:text-foreground bg-secondary rounded-full transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Actualisation...' : 'Actualiser'}
        </button>
      </div>

      {/* Feed Content */}
      <div className="max-w-2xl mx-auto">
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
      </div>
    </div>
  );
}