import { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { LEVEL_CONFIG, type SessionLevel } from '@/lib/sessionLevelCalculator';
import { motion } from 'framer-motion';

interface LevelSliderFilterProps {
  selectedLevel: number | null;
  onLevelChange: (level: number | null) => void;
  className?: string;
}

const LEVELS: SessionLevel[] = [6, 5, 4, 3, 2, 1]; // Top to bottom (Elite at top)
const TRACK_HEIGHT = 140; // Height of the slider track in pixels
const THUMB_SIZE = 24; // Size of the draggable thumb
const STEP_HEIGHT = TRACK_HEIGHT / (LEVELS.length - 1);

export const LevelSliderFilter = ({
  selectedLevel,
  onLevelChange,
  className,
}: LevelSliderFilterProps) => {
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
  
  const currentLevel = selectedLevel || 1; // Default to level 1 (show all)
  const currentConfig = LEVEL_CONFIG[currentLevel as SessionLevel];
  
  const handleInteraction = useCallback((clientY: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const y = clientY - rect.top;
    const newLevel = positionToLevel(y);
    onLevelChange(newLevel);
  }, [onLevelChange]);
  
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    handleInteraction(e.clientY);
  }, [handleInteraction]);
  
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true);
    handleInteraction(e.touches[0].clientY);
  }, [handleInteraction]);
  
  const handleMove = useCallback((clientY: number) => {
    if (!isDragging) return;
    handleInteraction(clientY);
  }, [isDragging, handleInteraction]);
  
  // Global mouse/touch listeners
  useEffect(() => {
    if (!isDragging) return;
    
    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientY);
    const handleTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientY);
    const handleEnd = () => setIsDragging(false);
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleEnd);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, handleMove]);

  const hasActiveFilter = selectedLevel !== null && selectedLevel > 1;

  // Double tap to reset
  const lastTapRef = useRef<number>(0);
  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      onLevelChange(null);
    }
    lastTapRef.current = now;
  }, [onLevelChange]);

  return (
    <div 
      className={cn(
        'relative flex flex-col items-center',
        className
      )}
      onClick={handleDoubleTap}
    >
      {/* Conteneur façon « tuile » iOS colorée (comme les icônes Réglages), version verticale niveau */}
      <div
        className={cn(
          "relative flex flex-col items-center rounded-[14px] border border-white/25 bg-primary p-2 shadow-lg",
          isDragging && "shadow-xl"
        )}
        style={{ width: 44 }}
      >
        {/* Vertical slider track */}
        <div 
          ref={trackRef}
          className="relative cursor-pointer touch-none"
          style={{ height: TRACK_HEIGHT, width: 24 }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {/* Track background - iOS gray */}
          <div className="absolute left-1/2 h-full w-[4px] -translate-x-1/2 rounded-full bg-white/25" />

          {/* Portion active */}
          <motion.div
            className="absolute left-1/2 w-[4px] -translate-x-1/2 rounded-full bg-white"
            style={{ 
              bottom: 0,
            }}
            animate={{
              height: TRACK_HEIGHT - levelToPosition(currentLevel),
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
          
          {/* Level tick marks */}
          {LEVELS.map((level, index) => {
            const isActive = level <= currentLevel;
            const y = index * STEP_HEIGHT;
            
            return (
              <div
                key={level}
                className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center"
                style={{ top: y - 3 }}
              >
                {/* Small tick */}
                <div
                  className={cn(
                    "h-[6px] w-[6px] rounded-full transition-all duration-200",
                    isActive ? "bg-white opacity-100" : "bg-white/35 opacity-80"
                  )}
                />
              </div>
            );
          })}
          
          {/* Draggable thumb - iOS style */}
          <motion.div
            className={cn(
              "absolute left-1/2 -translate-x-1/2 cursor-grab rounded-full border border-white/40 bg-white shadow-md active:cursor-grabbing",
              isDragging && "scale-110"
            )}
            style={{ 
              width: THUMB_SIZE,
              height: THUMB_SIZE,
            }}
            animate={{ 
              top: levelToPosition(currentLevel) - THUMB_SIZE / 2 + 3,
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
        </div>
        
        {/* Level indicator at bottom */}
        <div className="mt-2 flex flex-col items-center">
          <span className="text-[11px] font-bold text-white tabular-nums">{currentLevel}</span>
        </div>
      </div>
      
      {/* Floating label - appears when filtering */}
      {hasActiveFilter && (
        <motion.div
          initial={{ opacity: 0, x: 10, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          className={cn(
            "absolute right-full top-1/2 mr-2 -translate-y-1/2 whitespace-nowrap rounded-lg border border-border bg-card/95 px-2 py-1 shadow-md backdrop-blur-sm"
          )}
        >
          <p className="text-[10px] text-muted-foreground">Niveau</p>
          <p 
            className="text-[11px] font-semibold"
            style={{ color: currentConfig.color }}
          >
            {currentLevel}+ {currentConfig.label}
          </p>
        </motion.div>
      )}
    </div>
  );
};
