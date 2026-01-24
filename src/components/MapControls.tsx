import React from 'react';
import { RotateCcw, Box } from 'lucide-react';
interface MapControlsProps {
  onResetView: () => void;
  onToggle3D: () => void;
}
export const MapControls: React.FC<MapControlsProps> = ({
  onResetView,
  onToggle3D
}) => {
  return <div className="bg-card border border-border rounded-[10px] shadow-sm overflow-hidden">
      <button onClick={onResetView} className="w-10 h-10 p-0 flex items-center justify-center hover:bg-secondary active:bg-secondary/80 transition-colors border-b border-border" title="Réinitialiser la vue">
        <RotateCcw size={16} className="text-foreground" />
      </button>
      
    </div>;
};