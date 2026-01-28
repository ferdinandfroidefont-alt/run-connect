import { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { LEVEL_CONFIG, type SessionLevel } from '@/lib/sessionLevelCalculator';
import { motion, AnimatePresence } from 'framer-motion';

interface LevelSliderFilterProps {
  selectedLevel: number | null;
  onLevelChange: (level: number | null) => void;
  className?: string;
}

const LEVELS: SessionLevel[] = [6, 5, 4, 3, 2, 1]; // Top to bottom (Elite at top)
const TRACK_HEIGHT = 200; // Height of the slider track in pixels
const THUMB_SIZE = 28; // Size of the draggable thumb
const STEP_HEIGHT = TRACK_HEIGHT / (LEVELS.length - 1);

export const LevelSliderFilter = ({
  selectedLevel,
  onLevelChange,
  className,
}: LevelSliderFilterProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  
  // Convert level (1-6) to Y position
  const levelToPosition = (level: number): number => {
    const index = LEVELS.indexOf(level as SessionLevel);
    return index * STEP_HEIGHT;
  };
  
  // Convert Y position to level (1-6)
  const positionToLevel = (y: number): SessionLevel => {
    const clampedY = Math.max(0, Math.min(y, TRACK_HEIGHT));
    const index = Math.round(clampedY / STEP_HEIGHT);
    return LEVELS[Math.min(index, LEVELS.length - 1)];
  };
  
  const currentLevel = selectedLevel || 3; // Default to level 3 (Intermédiaire)
  const currentConfig = LEVEL_CONFIG[currentLevel as SessionLevel];
  
  const handleTrackClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const newLevel = positionToLevel(y);
    onLevelChange(newLevel);
  }, [onLevelChange]);
  
  const handleDrag = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !trackRef.current) return;
    
    const rect = trackRef.current.getBoundingClientRect();
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const y = clientY - rect.top;
    const newLevel = positionToLevel(y);
    onLevelChange(newLevel);
  }, [isDragging, onLevelChange]);
  
  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);
  
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);
  
  // Global mouse/touch up listener
  useEffect(() => {
    if (isDragging) {
      const handleGlobalUp = () => setIsDragging(false);
      window.addEventListener('mouseup', handleGlobalUp);
      window.addEventListener('touchend', handleGlobalUp);
      return () => {
        window.removeEventListener('mouseup', handleGlobalUp);
        window.removeEventListener('touchend', handleGlobalUp);
      };
    }
  }, [isDragging]);

  const hasActiveFilter = selectedLevel !== null;

  return (
    <div className={cn('relative', className)}>
      {/* Collapsed state - compact button */}
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
        {/* Slider icon */}
        <div className="flex flex-col items-center justify-center gap-1">
          <div className="w-4 h-0.5 bg-muted-foreground/60 rounded-full" />
          <div 
            className="w-2.5 h-2.5 rounded-full border-2 transition-colors"
            style={{ 
              borderColor: hasActiveFilter ? currentConfig.color : 'rgb(156 163 175)',
              backgroundColor: hasActiveFilter ? currentConfig.color : 'transparent'
            }}
          />
          <div className="w-4 h-0.5 bg-muted-foreground/60 rounded-full" />
        </div>
      </motion.button>

      {/* Expanded iOS-style vertical slider */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: 10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={cn(
              'absolute top-0 right-12 z-50',
              'bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50',
              'p-4 flex flex-col items-center gap-3'
            )}
          >
            {/* Current level label */}
            <div className="text-center mb-1">
              <div 
                className="text-xs font-semibold"
                style={{ color: currentConfig.color }}
              >
                Niveau {currentLevel}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {currentConfig.label}
              </div>
            </div>

            {/* Vertical slider track */}
            <div 
              ref={trackRef}
              className="relative cursor-pointer"
              style={{ height: TRACK_HEIGHT, width: 32 }}
              onClick={handleTrackClick}
              onMouseMove={handleDrag}
              onTouchMove={handleDrag}
            >
              {/* Track background */}
              <div className="absolute left-1/2 -translate-x-1/2 w-1 h-full bg-secondary rounded-full" />
              
              {/* Level markers */}
              {LEVELS.map((level, index) => {
                const config = LEVEL_CONFIG[level];
                const isSelected = level === currentLevel;
                const y = index * STEP_HEIGHT;
                
                return (
                  <div
                    key={level}
                    className="absolute left-1/2 -translate-x-1/2 flex items-center"
                    style={{ top: y }}
                  >
                    {/* Tick mark */}
                    <div 
                      className={cn(
                        'w-3 h-3 rounded-full transition-all duration-200',
                        isSelected ? 'scale-100' : 'scale-75 opacity-40'
                      )}
                      style={{ 
                        backgroundColor: isSelected ? config.color : '#d1d5db'
                      }}
                    />
                    
                    {/* Level number on the left */}
                    <span 
                      className={cn(
                        'absolute right-6 text-[10px] font-medium transition-all duration-200',
                        isSelected ? 'opacity-100' : 'opacity-40'
                      )}
                      style={{ color: isSelected ? config.color : '#9ca3af' }}
                    >
                      {level}
                    </span>
                  </div>
                );
              })}
              
              {/* Draggable thumb */}
              <motion.div
                className={cn(
                  'absolute left-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing',
                  'rounded-full shadow-lg border-4 border-white',
                  'transition-shadow duration-200',
                  isDragging && 'shadow-xl ring-4 ring-primary/20'
                )}
                style={{ 
                  width: THUMB_SIZE,
                  height: THUMB_SIZE,
                  top: levelToPosition(currentLevel) - THUMB_SIZE / 2 + 6,
                  backgroundColor: currentConfig.color,
                }}
                animate={{ 
                  top: levelToPosition(currentLevel) - THUMB_SIZE / 2 + 6,
                  scale: isDragging ? 1.1 : 1
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                onMouseDown={handleDragStart}
                onTouchStart={handleDragStart}
              />
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2 w-full mt-2">
              {/* Reset button */}
              {hasActiveFilter && (
                <motion.button
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full py-1.5 text-[11px] text-primary font-medium rounded-lg bg-primary/10 hover:bg-primary/15 transition-colors"
                  onClick={() => {
                    onLevelChange(null);
                    setIsExpanded(false);
                  }}
                >
                  Afficher tous
                </motion.button>
              )}
              
              {/* Close button */}
              <button
                className="w-full py-1.5 text-[11px] text-muted-foreground font-medium rounded-lg hover:bg-secondary transition-colors"
                onClick={() => setIsExpanded(false)}
              >
                Fermer
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
