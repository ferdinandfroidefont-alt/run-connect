import { MoreHorizontal, Plus } from "lucide-react";
import { MiniWorkoutProfile } from "@/components/coaching/MiniWorkoutProfile";
import { Button } from "@/components/ui/button";
import type { MiniProfileBlock } from "@/lib/workoutVisualization";
import type { SessionModelItem } from "@/components/coaching/models/types";

interface ModelCardProps {
  model: SessionModelItem;
  summaryLine: string;
  previewLine: string;
  accentColor: string;
  miniProfile?: MiniProfileBlock[];
  onOpen: () => void;
  onAdd: () => void;
  onMenu?: () => void;
}

export function ModelCard({ model, summaryLine, previewLine, accentColor, miniProfile, onOpen, onAdd, onMenu }: ModelCardProps) {
  return (
    <div className="overflow-hidden bg-card">
      <div className="flex">
        <div className="w-1 shrink-0" style={{ backgroundColor: accentColor }} />
        <div className="min-w-0 flex-1 p-4">
          <button type="button" className="w-full text-left" onClick={onOpen}>
            <p className="truncate text-[15px] font-semibold text-foreground">{model.title}</p>
            <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{summaryLine}</p>
            <div className="mt-2">
              <MiniWorkoutProfile blocks={miniProfile} compact />
            </div>
            <p className="mt-1 truncate text-[12px] text-foreground/80">{previewLine}</p>
          </button>
          <div className="mt-3 flex items-center gap-2">
            <Button type="button" className="h-9 flex-1 rounded-lg text-[13px] font-semibold" onClick={onAdd}>
              <Plus className="mr-1.5 h-4 w-4" />
              Ajouter au planning
            </Button>
            {onMenu ? (
              <Button type="button" variant="secondary" size="icon" className="h-9 w-9 rounded-lg" onClick={onMenu}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

