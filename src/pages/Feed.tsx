import { useEffect, useRef, useCallback } from 'react';
import { useFeed } from '@/hooks/useFeed';
import { FeedCard } from '@/components/feed/FeedCard';
import { FeedHeader } from '@/components/feed/FeedHeader';
import { StoriesCarousel } from '@/components/feed/StoriesCarousel';
import { FeedEmptyState } from '@/components/feed/FeedEmptyState';
import { Loader2, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

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
      {/* Premium Header */}
      <FeedHeader 
        onSearch={() => navigate('/search')}
      />

      {/* Stories Carousel */}
      <StoriesCarousel />

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mx-4" />

      {/* Pull to Refresh Button */}
      <div className="flex justify-center py-3">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground bg-white/5 hover:bg-white/10 rounded-full transition-colors"
        >
          <motion.div
            animate={isRefreshing ? { rotate: 360 } : {}}
            transition={{ duration: 1, repeat: isRefreshing ? Infinity : 0, ease: "linear" }}
          >
            <RefreshCw className="h-4 w-4" />
          </motion.div>
          {isRefreshing ? 'Actualisation...' : 'Actualiser'}
        </motion.button>
      </div>

      {/* Feed Content */}
      <div className="px-4 max-w-2xl mx-auto">
        {loading && feedItems.length === 0 ? (
          // Loading skeleton
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className="bg-card/30 rounded-2xl border border-white/10 overflow-hidden"
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-white/10 animate-pulse" />
                    <div className="space-y-1.5">
                      <div className="h-3 w-24 bg-white/10 rounded animate-pulse" />
                      <div className="h-2 w-16 bg-white/10 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="h-4 w-3/4 bg-white/10 rounded animate-pulse" />
                  <div className="h-40 bg-white/10 rounded-xl animate-pulse" />
                </div>
              </motion.div>
            ))}
          </div>
        ) : feedItems.length === 0 ? (
          // Empty state
          <FeedEmptyState />
        ) : (
          // Feed items
          <AnimatePresence mode="popLayout">
            {feedItems.map((session, index) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
              >
                <FeedCard
                  session={session}
                  onLike={likeSession}
                  onUnlike={unlikeSession}
                  onAddComment={addComment}
                  onJoinSession={handleJoinSession}
                  onViewComments={handleViewComments}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {/* Infinite scroll trigger */}
        {hasMore && feedItems.length > 0 && (
          <div ref={observerTarget} className="flex justify-center py-6">
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </motion.div>
          </div>
        )}

        {/* End of feed */}
        {!hasMore && feedItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-8 text-center"
          >
            <p className="text-sm text-muted-foreground">
              Vous êtes à jour ! 🎉
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
