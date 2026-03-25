import React from "react";
import { RotateCcw, Box } from "lucide-react";
import { MapIosColoredFab } from "@/components/map/MapIosColoredFab";

interface MapControlsProps {
  onResetView: () => void;
}

export const MapControls: React.FC<MapControlsProps> = ({ onResetView }) => {
  return (
    <div className="flex flex-col gap-2">
      <MapIosColoredFab type="button" tone="yellow" title="Réinitialiser la vue" onClick={onResetView}>
        <RotateCcw className="h-[18px] w-[18px]" strokeWidth={2.25} />
      </MapIosColoredFab>
    </div>
  );
};
