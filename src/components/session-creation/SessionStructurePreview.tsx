import { useMemo } from "react";
import type { SessionBlock } from "./types";
import { cn } from "@/lib/utils";
import { buildWorkoutSegments, renderWorkoutMiniProfile } from "@/lib/workoutVisualization";

interface SessionStructurePreviewProps {
  blocks: SessionBlock[];
  className?: string;
}

const PLACEHOLDER_BARS = [
  { width: 1.2, height: 9, color: "hsl(var(--muted))", opacity: 0.5 },
  { width: 2.3, height: 12, color: "hsl(var(--muted))", opacity: 0.7 },
  { width: 1.6, height: 15, color: "hsl(var(--muted))", opacity: 0.55 },
  { width: 2.8, height: 17, color: "hsl(var(--muted))", opacity: 0.8 },
  { width: 1.8, height: 13, color: "hsl(var(--muted))", opacity: 0.6 },
  { width: 1.1, height: 10, color: "hsl(var(--muted))", opacity: 0.45 },
];

function toPositiveNumber(value?: string | number | null): number {
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : 0;
  if (typeof value !== "string") return 0;
  const parsed = Number.parseInt(value.replace(/\D/g, ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function buildPreviewBars(blocks: SessionBlock[]) {
  if (!blocks.length) return PLACEHOLDER_BARS;

  const normalizedBlocks = blocks.map((block) => {
    if (block.type === "interval") {
      return {
        type: "interval",
        repetitions: Math.max(1, block.repetitions ?? 1),
        blockRepetitions: Math.max(1, block.blockRepetitions ?? 1),
        duration: block.effortType === "time" ? toPositiveNumber(block.effortDuration) : 0,
        distance: block.effortType === "distance" ? toPositiveNumber(block.effortDuration) : 0,
        recoveryDuration: toPositiveNumber(block.recoveryDuration),
        blockRecoveryDuration: toPositiveNumber(block.blockRecoveryDuration),
        zone: block.effortIntensity,
      };
    }

    return {
      type: block.type,
      duration: block.durationType === "time" ? toPositiveNumber(block.duration) : 0,
      distance: block.durationType === "distance" ? toPositiveNumber(block.duration) : 0,
      zone: block.intensity,
    };
  });

  return renderWorkoutMiniProfile(buildWorkoutSegments(normalizedBlocks, { sport: "running" }));
}

export function SessionStructurePreview({ blocks, className }: SessionStructurePreviewProps) {
  const profile = useMemo(() => buildPreviewBars(blocks), [blocks]);
  const totalWeight = profile.reduce((sum, item) => sum + item.width, 0) || 1;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-background to-muted/30 px-3 py-4",
        className
      )}
    >
      <div className="flex h-16 items-end gap-1.5 rounded-xl bg-muted/30 px-2 py-2">
        {profile.map((bar, index) => (
          <span
            key={`${index}-${bar.width}-${bar.height}`}
            className="min-w-[6px] shrink-0 rounded-full shadow-sm"
            style={{
              flexBasis: `${(bar.width / totalWeight) * 100}%`,
              height: `${bar.height}px`,
              backgroundColor: bar.color,
              opacity: bar.opacity ?? 1,
            }}
          />
        ))}
      </div>
    </div>
  );
}