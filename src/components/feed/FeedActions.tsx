import { Heart, MessageCircle, UserPlus } from 'lucide-react';
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
}

export const FeedActions = ({
  likesCount,
  commentsCount,
  isLiked,
  onLike,
  onComment,
  onJoin
}: FeedActionsProps) => {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleLike = () => {
    setIsAnimating(true);
    onLike();
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
      <div className="flex items-center gap-4">
        <button
          onClick={handleLike}
          className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity"
        >
          <motion.div
            animate={isAnimating ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            <Heart
              className={`h-5 w-5 ${isLiked ? 'fill-red-500 text-red-500' : 'text-foreground'}`}
            />
          </motion.div>
          <span className={isLiked ? 'text-red-500 font-medium' : 'text-foreground'}>
            {likesCount}
          </span>
        </button>

        <button
          onClick={onComment}
          className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity text-foreground"
        >
          <MessageCircle className="h-5 w-5" />
          <span>{commentsCount}</span>
        </button>
      </div>

      <Button
        onClick={onJoin}
        size="sm"
        className="bg-primary hover:bg-primary/90 text-white rounded-full px-4"
      >
        <UserPlus className="h-4 w-4 mr-1" />
        Rejoindre
      </Button>
    </div>
  );
};