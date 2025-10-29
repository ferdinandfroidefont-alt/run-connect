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
      <div className="backdrop-blur-xl bg-white/[0.08] border border-white/[0.15] rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.4)] overflow-hidden">
        <button
          onClick={onResetView}
          className="w-8 h-7 p-0 flex items-center justify-center hover:bg-white/[0.12] transition-all border-0"
          title="Réinitialiser la vue"
        >
          <RotateCcw size={12} className="text-foreground" />
        </button>
        <button
          onClick={onToggle3D}
          className="w-8 h-7 p-0 flex items-center justify-center hover:bg-white/[0.12] transition-all border-0"
          title="Basculer en 3D"
        >
          <Box size={12} className="text-foreground" />
        </button>
      </div>

    </div>
  );
};