import React from "react";
import { RotateCcw, Box } from "lucide-react";
import { MapIosColoredFab } from "@/components/map/MapIosColoredFab";

interface MapControlsProps {
  onResetView: () => void;
  onToggle3D: () => void;
}

export const MapControls: React.FC<MapControlsProps> = ({ onResetView, onToggle3D }) => {
  return (
    <div className="flex flex-col gap-2">
      <MapIosColoredFab type="button" tone="gray" title="Réinitialiser la vue" onClick={onResetView}>
        <RotateCcw className="h-[18px] w-[18px]" strokeWidth={2.25} />
      </MapIosColoredFab>
      <MapIosColoredFab type="button" tone="indigo" title="Vue satellite / 3D" onClick={onToggle3D}>
        <Box className="h-[18px] w-[18px]" strokeWidth={2.25} />
      </MapIosColoredFab>
    </div>
  );
};
