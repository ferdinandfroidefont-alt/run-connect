import React from 'react';
import { RotateCcw, Box } from 'lucide-react';

interface MapControlsProps {
  onResetView: () => void;
  onToggle3D: () => void;
}

export const MapControls: React.FC<MapControlsProps> = ({
  onResetView,
  onToggle3D,
}) => {
  return (
    <div className="flex flex-col gap-3">
      {/* Additional Controls - moved above zoom controls */}
      <div className="bg-card/90 backdrop-blur-sm border border-border rounded-lg shadow-map-control overflow-hidden">
        <button
          onClick={onResetView}
          className="w-8 h-7 p-0 flex items-center justify-center hover:bg-muted/90 transition-colors border-b border-border"
          title="Réinitialiser la vue"
        >
          <RotateCcw size={12} className="text-foreground" />
        </button>
        <button
          onClick={onToggle3D}
          className="w-8 h-7 p-0 flex items-center justify-center hover:bg-muted/90 transition-colors"
          title="Basculer en 3D"
        >
          <Box size={12} className="text-foreground" />
        </button>
      </div>

    </div>
  );
};