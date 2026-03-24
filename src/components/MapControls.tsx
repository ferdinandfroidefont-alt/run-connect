import React from 'react';
import { RotateCcw, Box } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MapControlsProps {
  onResetView: () => void;
  onToggle3D: () => void;
}

export const MapControls: React.FC<MapControlsProps> = ({ onResetView, onToggle3D }) => {
  const cell = 'flex h-10 w-10 items-center justify-center transition-colors hover:bg-secondary active:bg-secondary/90';
  return (
    <div className="overflow-hidden rounded-ios-md border border-border bg-card shadow-[var(--shadow-card)]">
      <button type="button" onClick={onResetView} className={cn(cell, 'w-full border-b border-border')} title="Réinitialiser la vue">
        <RotateCcw className="h-[18px] w-[18px] text-foreground" strokeWidth={1.75} />
      </button>
      <button type="button" onClick={onToggle3D} className={cn(cell, 'w-full')} title="Vue satellite / plan">
        <Box className="h-[18px] w-[18px] text-foreground" strokeWidth={1.75} />
      </button>
    </div>
  );
};