import { useState, useRef } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Trash2, Pin } from 'lucide-react';

interface SwipeableConversationItemProps {
  children: React.ReactNode;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  isPinned: boolean;
  disabled?: boolean;
}

export const SwipeableConversationItem = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  isPinned,
  disabled = false
}: SwipeableConversationItemProps) => {
  const [isRevealed, setIsRevealed] = useState<'left' | 'right' | null>(null);
  const x = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const SWIPE_THRESHOLD = 80;
  const MAX_SWIPE = 100;

  // Background colors based on swipe direction
  const leftBgOpacity = useTransform(x, [-MAX_SWIPE, 0], [1, 0]);
  const rightBgOpacity = useTransform(x, [0, MAX_SWIPE], [0, 1]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const { offset } = info;
    
    if (offset.x < -SWIPE_THRESHOLD) {
      // Swipe left - Delete
      onSwipeLeft();
      x.set(0);
      setIsRevealed(null);
    } else if (offset.x > SWIPE_THRESHOLD) {
      // Swipe right - Pin/Unpin
      onSwipeRight();
      x.set(0);
      setIsRevealed(null);
    } else {
      // Reset position
      x.set(0);
      setIsRevealed(null);
    }
  };

  const handleDrag = (_: any, info: PanInfo) => {
    if (info.offset.x < -20) {
      setIsRevealed('left');
    } else if (info.offset.x > 20) {
      setIsRevealed('right');
    } else {
      setIsRevealed(null);
    }
  };

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <div ref={containerRef} className="relative overflow-hidden">
      {/* Background actions */}
      <motion.div 
        className="absolute inset-0 flex items-center justify-end px-4 bg-destructive"
        style={{ opacity: leftBgOpacity }}
      >
        <div className="flex items-center gap-2 text-white">
          <Trash2 className="h-5 w-5" />
          <span className="text-sm font-medium">Supprimer</span>
        </div>
      </motion.div>
      
      <motion.div 
        className="absolute inset-0 flex items-center justify-start px-4 bg-primary"
        style={{ opacity: rightBgOpacity }}
      >
        <div className="flex items-center gap-2 text-white">
          <Pin className="h-5 w-5" />
          <span className="text-sm font-medium">{isPinned ? 'Désépingler' : 'Épingler'}</span>
        </div>
      </motion.div>

      {/* Swipeable content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -MAX_SWIPE, right: MAX_SWIPE }}
        dragElastic={0.1}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="relative bg-background z-10"
      >
        {children}
      </motion.div>
    </div>
  );
};
