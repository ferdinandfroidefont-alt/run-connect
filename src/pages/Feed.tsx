import { useEffect, useRef, useCallback, useState } from 'react';
import { useFeed } from '@/hooks/useFeed';
import { FeedCard } from '@/components/feed/FeedCard';
import { FeedHeader } from '@/components/feed/FeedHeader';
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
      <div className="w-full h-6 bg-background flex-shrink-0" />
      
      <FeedHeader onSearch={() => navigate('/search')} />

      {/* Pull to Refresh */}
      <div className="flex justify-center py-3">
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Actualisation...' : 'Actualiser'}
        </button>
      </div>

      {/* Feed Content */}
      <div className="px-4 max-w-2xl mx-auto">
        {loading && feedItems.length === 0 ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-card rounded-xl border border-border overflow-hidden animate-pulse"
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted" />
                    <div className="space-y-1.5">
                      <div className="h-3 w-24 bg-muted rounded" />
                      <div className="h-2 w-16 bg-muted rounded" />
                    </div>
                  </div>
                  <div className="h-4 w-3/4 bg-muted rounded" />
                  <div className="h-32 bg-muted rounded-lg" />
                </div>
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
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* End of feed */}
        {!hasMore && feedItems.length > 0 && (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">Vous êtes à jour !</p>
          </div>
        )}
      </div>
    </div>
  );
}
