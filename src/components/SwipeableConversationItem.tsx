import { useState, useRef } from 'react';
import { motion, useMotionValue, useTransform, useSpring, PanInfo, animate } from 'framer-motion';
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
  const MAX_SWIPE = 120;

  // Spring config for bouncy effect
  const springConfig = { stiffness: 400, damping: 25, mass: 0.8 };
  const springX = useSpring(x, springConfig);

  // Background colors and scale based on swipe direction
  const leftBgOpacity = useTransform(x, [-MAX_SWIPE, -20, 0], [1, 0.5, 0]);
  const rightBgOpacity = useTransform(x, [0, 20, MAX_SWIPE], [0, 0.5, 1]);
  
  // Icon scale for feedback
  const leftIconScale = useTransform(x, [-MAX_SWIPE, -SWIPE_THRESHOLD, 0], [1.2, 1, 0.8]);
  const rightIconScale = useTransform(x, [0, SWIPE_THRESHOLD, MAX_SWIPE], [0.8, 1, 1.2]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const { offset, velocity } = info;
    
    // Factor in velocity for more natural feel
    const swipe = offset.x + velocity.x * 0.2;
    
    if (swipe < -SWIPE_THRESHOLD) {
      // Animate out then callback
      animate(x, -MAX_SWIPE * 1.5, {
        type: "spring",
        stiffness: 500,
        damping: 30,
        onComplete: () => {
          onSwipeLeft();
          animate(x, 0, { type: "spring", stiffness: 300, damping: 20 });
        }
      });
      setIsRevealed(null);
    } else if (swipe > SWIPE_THRESHOLD) {
      // Animate out then callback
      animate(x, MAX_SWIPE * 1.5, {
        type: "spring",
        stiffness: 500,
        damping: 30,
        onComplete: () => {
          onSwipeRight();
          animate(x, 0, { type: "spring", stiffness: 300, damping: 20 });
        }
      });
      setIsRevealed(null);
    } else {
      // Bounce back to center
      animate(x, 0, {
        type: "spring",
        stiffness: 500,
        damping: 25,
        velocity: velocity.x
      });
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
      {/* Background actions - Delete (left swipe) */}
      <motion.div 
        className="absolute inset-0 flex items-center justify-end px-6 bg-gradient-to-l from-destructive to-destructive/80"
        style={{ opacity: leftBgOpacity }}
      >
        <motion.div 
          className="flex items-center gap-2 text-white"
          style={{ scale: leftIconScale }}
        >
          <Trash2 className="h-6 w-6" />
          <span className="text-sm font-semibold">Supprimer</span>
        </motion.div>
      </motion.div>
      
      {/* Background actions - Pin (right swipe) */}
      <motion.div 
        className="absolute inset-0 flex items-center justify-start px-6 bg-gradient-to-r from-primary to-primary/80"
        style={{ opacity: rightBgOpacity }}
      >
        <motion.div 
          className="flex items-center gap-2 text-white"
          style={{ scale: rightIconScale }}
        >
          <Pin className="h-6 w-6" />
          <span className="text-sm font-semibold">{isPinned ? 'Désépingler' : 'Épingler'}</span>
        </motion.div>
      </motion.div>

      {/* Swipeable content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -MAX_SWIPE, right: MAX_SWIPE }}
        dragElastic={0.15}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        style={{ x }}
        whileDrag={{ cursor: 'grabbing' }}
        className="relative bg-background z-10 touch-pan-y"
      >
        {children}
      </motion.div>
    </div>
  );
};
