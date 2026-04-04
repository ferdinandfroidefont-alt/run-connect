import { Heart, MessageCircle, UserPlus, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

interface FeedActionsProps {
  sessionId: string;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  onLike: () => void;
  onComment: () => void;
  onJoin: () => void;
  onShare: () => void;
}

export const FeedActions = ({
  sessionId,
  likesCount,
  commentsCount,
  isLiked,
  onLike,
  onComment,
  onJoin,
  onShare
}: FeedActionsProps) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [showHearts, setShowHearts] = useState(false);

  const handleLike = () => {
    setIsAnimating(true);
    if (!isLiked) {
      setShowHearts(true);
      setTimeout(() => setShowHearts(false), 800);
    }
    onLike();
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <div className="relative">
      {/* Floating hearts animation */}
      <AnimatePresence>
        {showHearts && (
          <>
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  opacity: 1, 
                  scale: 0,
                  x: 30 + Math.random() * 20,
                  y: 0 
                }}
                animate={{ 
                  opacity: 0, 
                  scale: 1,
                  x: 30 + Math.random() * 40 - 20,
                  y: -60 - Math.random() * 40
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, delay: i * 0.05 }}
                className="absolute bottom-full left-0 pointer-events-none"
              >
                <Heart className="h-4 w-4 fill-primary text-primary" />
              </motion.div>
            ))}
          </>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between border-t border-border/60 px-5 py-4">
        <div className="flex items-center gap-1">
          {/* Like Button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleLike}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full hover:bg-secondary transition-colors"
          >
            <motion.div
              animate={isAnimating ? { scale: [1, 1.4, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              <Heart
                className={`h-5 w-5 transition-colors ${
                  isLiked
                    ? "fill-primary stroke-primary text-primary"
                    : "fill-transparent text-muted-foreground hover:stroke-primary/60 hover:text-primary/80"
                }`}
                strokeWidth={2}
              />
            </motion.div>
            <span className={`text-sm font-medium ${isLiked ? "text-primary" : "text-muted-foreground"}`}>
              {likesCount > 0 ? likesCount : ''}
            </span>
          </motion.button>

          {/* Comment Button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onComment}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full hover:bg-secondary transition-colors"
          >
            <MessageCircle className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
            <span className="text-sm font-medium text-muted-foreground">
              {commentsCount > 0 ? commentsCount : ''}
            </span>
          </motion.button>

          {/* Share Button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onShare}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full hover:bg-secondary transition-colors"
          >
            <Share2 className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
          </motion.button>
        </div>

        {/* Join Button */}
        <Button
          onClick={onJoin}
          size="sm"
          className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-5 shadow-lg shadow-primary/20 font-medium"
        >
          <UserPlus className="h-4 w-4 mr-1.5" />
          Rejoindre
        </Button>
      </div>
    </div>
  );
};
