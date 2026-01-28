import { useState, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { LEVEL_CONFIG, type SessionLevel } from '@/lib/sessionLevelCalculator';
import { motion, AnimatePresence } from 'framer-motion';

interface LevelPyramidFilterProps {
  selectedRange: [number, number] | null;
  onRangeChange: (range: [number, number] | null) => void;
  className?: string;
}

const LEVELS: SessionLevel[] = [6, 5, 4, 3, 2, 1]; // Top to bottom

export const LevelPyramidFilter = ({
  selectedRange,
  onRangeChange,
  className,
}: LevelPyramidFilterProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<number>(0);

  const isLevelSelected = useCallback((level: SessionLevel): boolean => {
    if (!selectedRange) return true; // All selected
    return level >= selectedRange[0] && level <= selectedRange[1];
  }, [selectedRange]);

  const handleLevelClick = useCallback((level: SessionLevel) => {
    const now = Date.now();
    const isDoubleTap = now - lastTapRef.current < 300;
    lastTapRef.current = now;

    if (isDoubleTap) {
      // Double tap = reset
      onRangeChange(null);
      return;
    }

    if (!selectedRange) {
      // First selection
      onRangeChange([level, level]);
    } else if (selectedRange[0] === level && selectedRange[1] === level) {
      // Same level tapped = reset
      onRangeChange(null);
    } else {
      // Single level selection
      onRangeChange([level, level]);
    }
  }, [selectedRange, onRangeChange]);

  const handleDragStart = useCallback((level: SessionLevel) => {
    setIsDragging(true);
    setDragStart(level);
    onRangeChange([level, level]);
  }, [onRangeChange]);

  const handleDragMove = useCallback((level: SessionLevel) => {
    if (!isDragging || dragStart === null) return;
    
    const min = Math.min(dragStart, level);
    const max = Math.max(dragStart, level);
    onRangeChange([min, max] as [number, number]);
  }, [isDragging, dragStart, onRangeChange]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setDragStart(null);
  }, []);

  const getSegmentWidth = (level: SessionLevel): string => {
    // Pyramid shape: wider at bottom
    const widths = {
      6: '30%',
      5: '45%',
      4: '60%',
      3: '75%',
      2: '90%',
      1: '100%',
    };
    return widths[level];
  };

  const hasActiveFilter = selectedRange !== null;

  return (
    <div className={cn('relative', className)}>
      {/* Collapsed state - just icon */}
      <motion.button
        className={cn(
          'w-10 h-10 rounded-[10px] flex items-center justify-center',
          'bg-white/95 backdrop-blur-md shadow-lg border border-border/50',
          'transition-all duration-200',
          hasActiveFilter && 'ring-2 ring-primary ring-offset-1'
        )}
        onClick={() => setIsExpanded(!isExpanded)}
        whileTap={{ scale: 0.95 }}
      >
        <div className="flex flex-col items-center gap-0.5">
          {[1, 2, 3].map((row) => (
            <div
              key={row}
              className="flex gap-0.5"
            >
              {Array(row).fill(0).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-1.5 h-1.5 rounded-sm',
                    hasActiveFilter ? 'bg-primary' : 'bg-muted-foreground/60'
                  )}
                />
              ))}
            </div>
          ))}
        </div>
      </motion.button>

      {/* Expanded pyramid filter */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            ref={containerRef}
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={cn(
              'absolute top-12 right-0 z-50',
              'bg-white/95 backdrop-blur-md rounded-[14px] shadow-xl border border-border/50',
              'p-3 min-w-[140px]'
            )}
            onMouseLeave={handleDragEnd}
            onTouchEnd={handleDragEnd}
          >
            {/* Header */}
            <div className="text-[11px] font-medium text-muted-foreground mb-2 text-center">
              Filtrer par niveau
            </div>

            {/* Pyramid segments */}
            <div className="flex flex-col items-center gap-1">
              {LEVELS.map((level) => {
                const config = LEVEL_CONFIG[level];
                const isSelected = isLevelSelected(level);
                
                return (
                  <motion.button
                    key={level}
                    className={cn(
                      'h-6 rounded-full flex items-center justify-center',
                      'transition-all duration-150 cursor-pointer',
                      'text-[11px] font-medium',
                      isSelected 
                        ? 'text-white shadow-sm' 
                        : 'bg-secondary/60 text-muted-foreground/50'
                    )}
                    style={{
                      width: getSegmentWidth(level),
                      backgroundColor: isSelected ? config.color : undefined,
                    }}
                    onClick={() => handleLevelClick(level)}
                    onMouseDown={() => handleDragStart(level)}
                    onMouseEnter={() => handleDragMove(level)}
                    onTouchStart={() => handleDragStart(level)}
                    onTouchMove={(e) => {
                      const touch = e.touches[0];
                      const element = document.elementFromPoint(touch.clientX, touch.clientY);
                      const levelAttr = element?.getAttribute('data-level');
                      if (levelAttr) {
                        handleDragMove(parseInt(levelAttr) as SessionLevel);
                      }
                    }}
                    data-level={level}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="truncate px-2">
                      {isSelected ? config.label : level}
                    </span>
                  </motion.button>
                );
              })}
            </div>

            {/* Reset button */}
            {hasActiveFilter && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full mt-3 py-1.5 text-[11px] text-primary font-medium rounded-lg bg-primary/10 hover:bg-primary/15 transition-colors"
                onClick={() => {
                  onRangeChange(null);
                  setIsExpanded(false);
                }}
              >
                Réinitialiser
              </motion.button>
            )}

            {/* Close hint */}
            <div className="text-[10px] text-muted-foreground/60 text-center mt-2">
              Double-tap pour tout afficher
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
