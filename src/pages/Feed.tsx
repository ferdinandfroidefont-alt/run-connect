import { useEffect, useRef, useCallback } from 'react';
import { useFeed } from '@/hooks/useFeed';
import { FeedCard } from '@/components/feed/FeedCard';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function Feed() {
  const navigate = useNavigate();
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

  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    await refresh();
  }, [refresh]);

  const handleJoinSession = (sessionId: string) => {
    navigate('/', { state: { openSessionId: sessionId } });
  };

  const handleViewComments = (sessionId: string) => {
    navigate('/', { state: { openSessionId: sessionId, focusComments: true } });
  };

  if (loading && feedItems.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-white/10 px-4 py-4">
        <h1 className="text-2xl font-bold text-center">Fil d'activité</h1>
      </div>

      {/* Feed */}
      <div className="px-4 py-4 max-w-2xl mx-auto">
        {feedItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg mb-4">
              Aucune activité pour le moment
            </p>
            <p className="text-sm text-muted-foreground">
              Suivez des amis pour voir leurs sessions ici !
            </p>
          </div>
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

            {/* Infinite scroll observer */}
            {hasMore && (
              <div ref={observerTarget} className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}