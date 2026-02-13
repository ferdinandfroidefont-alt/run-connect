import { useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

interface TrackingPoint {
  lat: number;
  lng: number;
}

interface LiveTrackingMapProps {
  trackingPoints: TrackingPoint[];
  currentPosition: { lat: number; lng: number } | null;
  isActive: boolean;
}

export const LiveTrackingMap = ({ trackingPoints, currentPosition, isActive }: LiveTrackingMapProps) => {
  if (!isActive || !currentPosition) return null;

  return (
    <div className="bg-background rounded-xl overflow-hidden p-4">
      <div className="flex items-center gap-2 mb-3">
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-2.5 h-2.5 bg-green-500 rounded-full"
        />
        <span className="text-[13px] font-medium text-foreground">
          Position en direct
        </span>
        <span className="text-[11px] text-muted-foreground ml-auto">
          {trackingPoints.length} points
        </span>
      </div>

      <div className="bg-secondary rounded-lg p-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
          <MapPin className="h-5 w-5 text-green-500" />
        </div>
        <div>
          <p className="text-[13px] font-medium text-foreground">
            {currentPosition.lat.toFixed(5)}, {currentPosition.lng.toFixed(5)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Le créateur partage sa position
          </p>
        </div>
      </div>

      {/* Open in Google Maps */}
      <button
        onClick={() => {
          const url = `https://www.google.com/maps/search/?api=1&query=${currentPosition.lat},${currentPosition.lng}`;
          window.open(url, '_blank');
        }}
        className="mt-2 w-full text-center text-[13px] text-primary py-2 hover:bg-primary/5 rounded-lg transition-colors"
      >
        Ouvrir dans Google Maps
      </button>
    </div>
  );
};
