import { MoreHorizontal, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SessionModelItem } from "@/components/coaching/models/types";
import { Bike, Dumbbell, Footprints, Moon, Waves, Zap } from "lucide-react";

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
  const sessionType = detectModelType(model, summaryLine, previewLine);
  const blocks = buildMiniSchema(sessionType);
  const SportIcon = iconForModel(model, summaryLine, previewLine);
  const isRest = sessionType === "rest";

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

type SessionType = "endurance" | "interval" | "tempo" | "recovery" | "progressive" | "rest";
type MiniBlock = { width: number; height: number; color: string };

function detectModelType(model: SessionModelItem, summaryLine: string, previewLine: string): SessionType {
  const text = `${model.title} ${model.objective || ""} ${summaryLine} ${previewLine}`.toLowerCase();
  if (text.includes("repos")) return "rest";
  if (text.includes("fraction") || text.includes("interval") || text.includes("vo2")) return "interval";
  if (text.includes("tempo") || text.includes("seuil") || text.includes("threshold")) return "tempo";
  if (text.includes("progress")) return "progressive";
  if (text.includes("recup") || text.includes("récup") || text.includes("recovery")) return "recovery";
  return "endurance";
}

function buildMiniSchema(type: SessionType): MiniBlock[] {
  switch (type) {
    case "interval":
      return [
        { width: 10, height: 10, color: "#22C55E" },
        { width: 14, height: 30, color: "#F97316" },
        { width: 10, height: 10, color: "#22C55E" },
        { width: 14, height: 30, color: "#F97316" },
        { width: 10, height: 10, color: "#22C55E" },
        { width: 14, height: 30, color: "#F97316" },
      ];
    case "tempo":
      return [
        { width: 14, height: 10, color: "#9CA3AF" },
        { width: 52, height: 26, color: "#8B5CF6" },
        { width: 14, height: 10, color: "#9CA3AF" },
      ];
    case "progressive":
      return [
        { width: 12, height: 10, color: "#9CA3AF" },
        { width: 12, height: 14, color: "#60A5FA" },
        { width: 12, height: 18, color: "#60A5FA" },
        { width: 12, height: 22, color: "#8B5CF6" },
        { width: 12, height: 26, color: "#8B5CF6" },
        { width: 12, height: 30, color: "#F97316" },
      ];
    case "recovery":
      return [
        { width: 14, height: 8, color: "#9CA3AF" },
        { width: 46, height: 12, color: "#22C55E" },
        { width: 14, height: 8, color: "#9CA3AF" },
      ];
    case "rest":
      return [];
    default:
      return [
        { width: 12, height: 16, color: "#60A5FA" },
        { width: 12, height: 16, color: "#60A5FA" },
        { width: 12, height: 16, color: "#60A5FA" },
        { width: 12, height: 16, color: "#60A5FA" },
        { width: 12, height: 16, color: "#60A5FA" },
        { width: 12, height: 16, color: "#60A5FA" },
      ];
  }
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

