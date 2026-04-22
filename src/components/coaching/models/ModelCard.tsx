import { MoreHorizontal, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SessionModelItem } from "@/components/coaching/models/types";
import { Bike, Dumbbell, Footprints, Moon, Waves, Zap } from "lucide-react";
import { parseRCC } from "@/lib/rccParser";
import { buildWorkoutSegments, renderWorkoutMiniProfile } from "@/lib/workoutVisualization";

interface ModelCardProps {
  model: SessionModelItem;
  summaryLine: string;
  previewLine: string;
  accentColor: string;
  onOpen: () => void;
  onAdd: () => void;
  onMenu?: () => void;
}

export function ModelCard({ model, summaryLine, previewLine, accentColor, onOpen, onAdd, onMenu }: ModelCardProps) {
  const parsed = parseRCC(model.rccCode);
  const segments = buildWorkoutSegments(parsed.blocks);
  const blocks = renderWorkoutMiniProfile(segments);
  const SportIcon = iconForModel(model, summaryLine, previewLine);
  const isRest = segments.length === 1 && segments[0]?.kind === "rest";

  return (
    <div className="overflow-hidden bg-card">
      <div className="flex">
        <div className="w-1 shrink-0" style={{ backgroundColor: accentColor }} />
        <div className="min-w-0 flex-1 p-4">
          <button type="button" className="w-full text-left" onClick={onOpen}>
            <div className="flex items-center gap-1.5">
              <SportIcon className="h-3.5 w-3.5 text-slate-500" />
              <p className="truncate text-[15px] font-semibold text-foreground">{model.title}</p>
            </div>
            {isRest ? (
              <div className="mt-1.5 h-9 w-full border-b border-dashed border-slate-300" />
            ) : (
              <div className="mt-1.5 flex h-9 w-full items-end gap-1 px-1">
                {blocks.map((block, idx) => (
                  <span
                    key={`${block.color}-${idx}`}
                    className="shrink-0"
                    style={{
                      width: `${block.width}%`,
                      minWidth: "8px",
                      height: `${block.height}px`,
                      backgroundColor: block.color,
                      borderRadius: "6px",
                    }}
                  />
                ))}
              </div>
            )}
            <p className="mt-1 truncate text-[12px] text-muted-foreground">{summaryLine}</p>
            <p className="mt-0.5 truncate text-[12px] text-foreground/80">{previewLine}</p>
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

function iconForModel(model: SessionModelItem, summaryLine: string, previewLine: string) {
  const text = `${model.title} ${model.activityType} ${summaryLine} ${previewLine}`.toLowerCase();
  if (text.includes("velo") || text.includes("vélo") || text.includes("cycling")) return Bike;
  if (text.includes("natation") || text.includes("swim")) return Waves;
  if (text.includes("renfo") || text.includes("muscu") || text.includes("strength")) return Dumbbell;
  if (text.includes("fraction") || text.includes("interval")) return Zap;
  if (text.includes("repos")) return Moon;
  return Footprints;
}

