import React from "react";
import { RotateCcw, Box } from "lucide-react";
import { MapIosColoredFab } from "@/components/map/MapIosColoredFab";

interface MapControlsProps {
  onResetView: () => void;
}

export const MapControls: React.FC<MapControlsProps> = ({ onResetView }) => {
  return (
    <div className="flex flex-col gap-2">
      <MapIosColoredFab
        type="button"
        tone="gray"
        title="Réinitialiser la vue"
        onClick={onResetView}
        className="bg-white text-black shadow-[0_6px_18px_-8px_rgba(0,0,0,0.45)] [&_span]:text-black [&_span_svg]:stroke-black [&_span_svg]:text-black dark:bg-[#0a0a0a] dark:text-foreground dark:border dark:border-[#1f1f1f] dark:[&_span]:text-foreground dark:[&_span_svg]:stroke-foreground dark:[&_span_svg]:text-foreground"
      >
        <RotateCcw className="h-[18px] w-[18px]" strokeWidth={2.25} />
      </MapIosColoredFab>
    </div>
  );
};
