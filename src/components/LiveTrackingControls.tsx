import { Play, Square, MapPin, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface LiveTrackingControlsProps {
  isTracking: boolean;
  elapsedMinutes: number;
  maxDuration: number;
  onStart: () => void;
  onStop: () => void;
  isOrganizer: boolean;
}

export const LiveTrackingControls = ({
  isTracking,
  elapsedMinutes,
  maxDuration,
  onStart,
  onStop,
  isOrganizer,
}: LiveTrackingControlsProps) => {
  if (!isOrganizer) return null;

  return (
    <div className="bg-background rounded-xl overflow-hidden">
      {isTracking ? (
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-3 h-3 bg-green-500 rounded-full"
              />
              <span className="text-[15px] font-medium text-foreground">
                Live Tracking actif
              </span>
            </div>
            <div className="flex items-center gap-1 text-[13px] text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {elapsedMinutes} / {maxDuration} min
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-green-500 rounded-full"
              style={{ width: `${Math.min((elapsedMinutes / maxDuration) * 100, 100)}%` }}
            />
          </div>

          <Button
            onClick={onStop}
            variant="destructive"
            className="w-full h-11 rounded-xl text-[15px] font-medium"
          >
            <Square className="h-4 w-4 mr-2" />
            Terminer la séance
          </Button>
        </div>
      ) : (
        <button
          onClick={onStart}
          className="w-full flex items-center gap-3 px-4 py-3 active:bg-secondary/50"
        >
          <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
            <Play className="h-4 w-4 text-white" />
          </div>
          <span className="text-[15px] text-foreground">Démarrer le Live Tracking</span>
        </button>
      )}
    </div>
  );
};
