import React from 'react';
import { Plus, Minus, RotateCcw, Box } from 'lucide-react';

interface MapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onToggle3D: () => void;
}

export const MapControls: React.FC<MapControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onResetView,
  onToggle3D,
}) => {
  return (
    <div className="absolute bottom-6 left-6 flex flex-col gap-2">
      {/* Additional Controls - moved above zoom controls */}
      <div className="bg-map-control/90 backdrop-blur-sm border border-map-control-border rounded-lg shadow-map-control overflow-hidden">
        <button
          onClick={onResetView}
          className="w-10 h-10 flex items-center justify-center hover:bg-map-control-hover transition-colors border-b border-map-control-border"
          title="Réinitialiser la vue"
        >
          <RotateCcw size={18} className="text-foreground" />
        </button>
        <button
          onClick={onToggle3D}
          className="w-10 h-10 flex items-center justify-center hover:bg-map-control-hover transition-colors"
          title="Basculer en 3D"
        >
          <Box size={18} className="text-foreground" />
        </button>
      </div>

      {/* Zoom Controls - moved below additional controls */}
      <div className="bg-map-control/90 backdrop-blur-sm border border-map-control-border rounded-lg shadow-map-control overflow-hidden">
        <button
          onClick={onZoomIn}
          className="w-10 h-10 flex items-center justify-center hover:bg-map-control-hover transition-colors border-b border-map-control-border"
          title="Zoom avant"
        >
          <Plus size={18} className="text-foreground" />
        </button>
        <button
          onClick={onZoomOut}
          className="w-10 h-10 flex items-center justify-center hover:bg-map-control-hover transition-colors"
          title="Zoom arrière"
        >
          <Minus size={18} className="text-foreground" />
        </button>
      </div>
    </div>
  );
};