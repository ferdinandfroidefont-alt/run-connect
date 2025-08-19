import React from 'react';
import { Plus, Minus, RotateCcw, Box, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface MapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onToggle3D: () => void;
  onPanUp: () => void;
  onPanDown: () => void;
  onPanLeft: () => void;
  onPanRight: () => void;
}

export const MapControls: React.FC<MapControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onResetView,
  onToggle3D,
  onPanUp,
  onPanDown,
  onPanLeft,
  onPanRight,
}) => {
  return (
    <>
      {/* Navigation Controls - positioned above style selector */}
      <div className="absolute bottom-32 right-6 flex flex-col gap-2">
        {/* Up button */}
        <button
          onClick={onPanUp}
          className="w-10 h-10 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full shadow-lg hover:bg-gray-50 transition-colors flex items-center justify-center"
          title="Déplacer vers le haut"
        >
          <ChevronUp size={18} className="text-gray-700" />
        </button>
        
        {/* Left and Right buttons */}
        <div className="flex gap-2">
          <button
            onClick={onPanLeft}
            className="w-10 h-10 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full shadow-lg hover:bg-gray-50 transition-colors flex items-center justify-center"
            title="Déplacer vers la gauche"
          >
            <ChevronLeft size={18} className="text-gray-700" />
          </button>
          <button
            onClick={onPanRight}
            className="w-10 h-10 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full shadow-lg hover:bg-gray-50 transition-colors flex items-center justify-center"
            title="Déplacer vers la droite"
          >
            <ChevronRight size={18} className="text-gray-700" />
          </button>
        </div>
        
        {/* Down button */}
        <button
          onClick={onPanDown}
          className="w-10 h-10 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full shadow-lg hover:bg-gray-50 transition-colors flex items-center justify-center"
          title="Déplacer vers le bas"
        >
          <ChevronDown size={18} className="text-gray-700" />
        </button>
      </div>

      {/* Zoom and Additional Controls - left side */}
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
    </>
  );
};