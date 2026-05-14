import { MoreHorizontal, Plus } from "lucide-react";
import { MiniWorkoutProfile } from "@/components/coaching/MiniWorkoutProfile";
import { Button } from "@/components/ui/button";
import type { MiniProfileBlock } from "@/lib/workoutVisualization";
import type { SessionModelItem } from "@/components/coaching/models/types";

const ACTION_BLUE = "#007AFF";

interface ModelCardProps {
  model: SessionModelItem;
  summaryLine: string;
  previewLine: string;
  accentColor: string;
  miniProfile?: MiniProfileBlock[];
  addButtonLabel?: string;
  onOpen: () => void;
  onAdd: () => void;
  onMenu?: () => void;
  /** Carte type maquette Figma / RunConnect (11) */
  maquette?: boolean;
}

export function ModelCard({
  model,
  summaryLine,
  previewLine,
  accentColor,
  miniProfile,
  addButtonLabel = "Ajouter au planning",
  onOpen,
  onAdd,
  onMenu,
  maquette,
}: ModelCardProps) {
  if (maquette) {
    return (
      <div
        className="overflow-hidden bg-white"
        style={{
          borderRadius: 18,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)",
        }}
      >
        <div className="flex">
          <div className="w-1 shrink-0" style={{ backgroundColor: accentColor }} />
          <div className="min-w-0 flex-1 py-3.5 pl-[18px] pr-3.5">
            <button type="button" className="w-full text-left" onClick={onOpen}>
              <p
                className="m-0 truncate text-[18px] font-extrabold tracking-[-0.01em]"
                style={{ color: "#0A0F1F", lineHeight: 1.2 }}
              >
                {model.title}
              </p>
              <p className="mb-0 mt-[3px] truncate text-[13.5px]" style={{ color: "#8E8E93" }}>
                {summaryLine}
              </p>
              <div className="mt-1">
                <MiniWorkoutProfile blocks={miniProfile} compact variant="premiumCompact" className="h-8" />
              </div>
              <p className="mb-0 mt-2 truncate text-[12.5px] font-medium" style={{ color: "#8E8E93", fontVariantNumeric: "tabular-nums" }}>
                {previewLine}
              </p>
            </button>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-[14px] py-3 transition-transform active:scale-[0.99]"
                style={{
                  background: ACTION_BLUE,
                  boxShadow: "0 1px 2px rgba(0, 122, 255, 0.15)",
                }}
                onClick={onAdd}
              >
                <Plus className="h-4 w-4 text-white" strokeWidth={2.8} />
                <span className="text-[15px] font-bold tracking-[-0.01em] text-white">{addButtonLabel}</span>
              </button>
              {onMenu ? (
                <button
                  type="button"
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[14px] transition-colors active:bg-[#D1D1D6]"
                  style={{ background: "#F2F2F7" }}
                  aria-label="Plus d'options"
                  onClick={onMenu}
                >
                  <span className="text-[20px] font-bold leading-none tracking-[-0.05em] text-[#0A0F1F]">⋯</span>
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden bg-card">
      <div className="flex">
        <div className="w-1 shrink-0" style={{ backgroundColor: accentColor }} />
        <div className="min-w-0 flex-1 p-4">
          <button type="button" className="w-full text-left" onClick={onOpen}>
            <p className="truncate text-[15px] font-semibold text-foreground">{model.title}</p>
            <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{summaryLine}</p>
            <div className="mt-2">
              <MiniWorkoutProfile blocks={miniProfile} compact variant="premiumCompact" className="h-8" />
            </div>
            <p className="mt-1 truncate text-[12px] text-foreground/80">{previewLine}</p>
          </button>
          <div className="mt-3 flex items-center gap-2">
            <Button type="button" className="h-9 flex-1 rounded-lg text-[13px] font-semibold" onClick={onAdd}>
              <Plus className="mr-1.5 h-4 w-4" />
              {addButtonLabel}
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

