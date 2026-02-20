import { ThumbsUp, MessageCircle, UserPlus, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
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

  const handleLike = () => {
    setIsAnimating(true);
    onLike();
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-1">
        {/* Ride On Button (cyan like) */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleLike}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-full transition-colors ${
            isLiked ? 'bg-[hsl(193_100%_42%)]/10' : 'hover:bg-secondary'
          }`}
        >
          <motion.div
            animate={isAnimating ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            <ThumbsUp
              className={`h-5 w-5 transition-colors ${
                isLiked ? 'fill-[hsl(193_100%_42%)] text-[hsl(193_100%_42%)]' : 'text-muted-foreground'
              }`}
            />
          </motion.div>
          <span className={`text-sm font-semibold ${isLiked ? 'text-[hsl(193_100%_42%)]' : 'text-muted-foreground'}`}>
            {likesCount > 0 ? likesCount : ''}
          </span>
        </motion.button>

        {/* Comment Button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onComment}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full hover:bg-secondary transition-colors"
        >
          <MessageCircle className="h-5 w-5 text-muted-foreground" />
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
          <Share2 className="h-5 w-5 text-muted-foreground" />
        </motion.button>
      </div>

      {/* Join Button - pill outline */}
      <Button
        onClick={onJoin}
        size="sm"
        variant="outline"
        className="rounded-full px-5 border-primary text-primary font-semibold"
      >
        <UserPlus className="h-4 w-4 mr-1.5" />
        Rejoindre
      </Button>
    </div>
  );
};
