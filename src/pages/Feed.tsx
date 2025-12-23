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
      {/* Top spacer bar for Android */}
      <div className="w-full h-6 bg-background flex-shrink-0" />
      
      {/* Premium Header */}
      <FeedHeader 
        onSearch={() => navigate('/search')}
      />

      {/* Stories Carousel */}
      <StoriesCarousel />

      {/* Gradient Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent mx-4" />

      {/* Pull to Refresh Button with gradient */}
      <div className="flex justify-center py-3">
        <motion.button
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.02 }}
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 text-sm text-foreground bg-gradient-to-r from-primary/20 via-accent/10 to-primary/20 hover:from-primary/30 hover:via-accent/20 hover:to-primary/30 rounded-full transition-all border border-primary/30 shadow-lg shadow-primary/10"
        >
          <motion.div
            animate={isRefreshing ? { rotate: 360 } : {}}
            transition={{ duration: 1, repeat: isRefreshing ? Infinity : 0, ease: "linear" }}
          >
            <RefreshCw className="h-4 w-4 text-primary" />
          </motion.div>
          {isRefreshing ? 'Actualisation...' : 'Actualiser'}
        </motion.button>
      </div>

      {/* Feed Content */}
      <div className="px-4 max-w-2xl mx-auto">
        {loading && feedItems.length === 0 ? (
          // Loading skeleton with gradient
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className="glass-card overflow-hidden"
              >
                <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary animate-pulse" />
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 animate-pulse" />
                    <div className="space-y-1.5">
                      <div className="h-3 w-24 bg-primary/20 rounded animate-pulse" />
                      <div className="h-2 w-16 bg-muted/50 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="h-4 w-3/4 bg-muted/50 rounded animate-pulse" />
                  <div className="h-40 bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl animate-pulse" />
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

        {/* Infinite scroll trigger with gradient loader */}
        {hasMore && feedItems.length > 0 && (
          <div ref={observerTarget} className="flex justify-center py-6">
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="p-2 rounded-full bg-gradient-to-r from-primary/20 to-accent/20"
            >
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </motion.div>
          </div>
        )}

        {/* End of feed with celebration */}
        {!hasMore && feedItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-8 text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30">
              <span className="text-lg">🎉</span>
              <p className="text-sm text-foreground font-medium">
                Vous êtes à jour !
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
