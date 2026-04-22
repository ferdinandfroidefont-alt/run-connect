import { useMemo } from "react";
import type { SessionBlock } from "./types";
import { cn } from "@/lib/utils";

interface SessionStructurePreviewProps {
  blocks: SessionBlock[];
  className?: string;
}

type PreviewZone = "Z1" | "Z2" | "Z3" | "Z4" | "Z5" | "Z6" | "transition";

type PreviewBar = {
  weight: number;
  height: number;
  color: string;
  opacity?: number;
};

const PLACEHOLDER_BARS: PreviewBar[] = [
  { weight: 1.2, height: 9, color: "hsl(var(--muted))", opacity: 0.5 },
  { weight: 2.3, height: 12, color: "hsl(var(--muted))", opacity: 0.7 },
  { weight: 1.6, height: 15, color: "hsl(var(--muted))", opacity: 0.55 },
  { weight: 2.8, height: 17, color: "hsl(var(--muted))", opacity: 0.8 },
  { weight: 1.8, height: 13, color: "hsl(var(--muted))", opacity: 0.6 },
  { weight: 1.1, height: 10, color: "hsl(var(--muted))", opacity: 0.45 },
];

function toPositiveNumber(value?: string | number | null): number {
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : 0;
  if (typeof value !== "string") return 0;
  const parsed = Number.parseInt(value.replace(/\D/g, ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function normalizeZone(value?: string | null): PreviewZone {
  const normalized = value?.trim().toUpperCase();
  if (normalized === "Z1" || normalized === "Z2" || normalized === "Z3" || normalized === "Z4" || normalized === "Z5" || normalized === "Z6") {
    return normalized;
  }
  return "transition";
}

function colorForZone(zone: PreviewZone): string {
  switch (zone) {
    case "Z1":
      return "hsl(var(--chart-2) / 0.35)";
    case "Z2":
      return "hsl(var(--primary))";
    case "Z3":
      return "hsl(var(--chart-2))";
    case "Z4":
      return "hsl(var(--chart-4))";
    case "Z5":
      return "hsl(var(--chart-5))";
    case "Z6":
      return "hsl(var(--destructive))";
    default:
      return "hsl(var(--muted-foreground) / 0.35)";
  }
}

function heightForZone(zone: PreviewZone): number {
  switch (zone) {
    case "Z1":
      return 11;
    case "Z2":
      return 13;
    case "Z3":
      return 15;
    case "Z4":
      return 18;
    case "Z5":
      return 21;
    case "Z6":
      return 24;
    default:
      return 8;
  }
}

function continuousZoneForBlock(block: SessionBlock): PreviewZone {
  const explicit = normalizeZone(block.intensity);
  if (explicit !== "transition") return explicit;
  if (block.type === "warmup" || block.type === "cooldown") return "Z1";
  if (block.type === "steady") return "Z2";
  return "transition";
}

function effortZoneForInterval(block: SessionBlock): PreviewZone {
  const explicit = normalizeZone(block.effortIntensity);
  return explicit === "transition" ? "Z5" : explicit;
}

function continuousWeight(block: SessionBlock): number {
  const durationValue = toPositiveNumber(block.duration);
  const distanceFactor = block.durationType === "distance" ? 0.01 : 1;
  return Math.max(1.4, durationValue * distanceFactor || 2.2);
}

function intervalEffortWeight(block: SessionBlock): number {
  const durationValue = toPositiveNumber(block.effortDuration);
  const distanceFactor = block.effortType === "distance" ? 0.008 : 1 / 45;
  return Math.max(0.9, durationValue * distanceFactor || 1.2);
}

function recoveryWeight(value?: string): number {
  const seconds = toPositiveNumber(value);
  return Math.max(0.45, seconds / 75 || 0.55);
}

function buildPreviewBars(blocks: SessionBlock[]): PreviewBar[] {
  if (!blocks.length) return PLACEHOLDER_BARS;

  const bars: PreviewBar[] = [];

  blocks.forEach((block) => {
    if (block.type === "interval") {
      const seriesCount = Math.max(1, block.blockRepetitions ?? 1);
      const repetitions = Math.max(1, block.repetitions ?? 1);
      const effortZone = effortZoneForInterval(block);
      const effortColor = colorForZone(effortZone);
      const recoveryColor = colorForZone("transition");
      const effortHeight = heightForZone(effortZone);
      const repWeight = intervalEffortWeight(block);
      const repRecoveryWeight = recoveryWeight(block.recoveryDuration);
      const blockRecovery = recoveryWeight(block.blockRecoveryDuration);

      for (let seriesIndex = 0; seriesIndex < seriesCount; seriesIndex += 1) {
        for (let repIndex = 0; repIndex < repetitions; repIndex += 1) {
          bars.push({
            weight: repWeight,
            height: effortHeight,
            color: effortColor,
          });

          if (repIndex < repetitions - 1) {
            bars.push({
              weight: repRecoveryWeight,
              height: 8,
              color: recoveryColor,
              opacity: 0.85,
            });
          }
        }

        if (seriesIndex < seriesCount - 1) {
          bars.push({
            weight: blockRecovery,
            height: 7,
            color: recoveryColor,
            opacity: 0.6,
          });
        }
      }

      return;
    }

    const zone = continuousZoneForBlock(block);
    bars.push({
      weight: continuousWeight(block),
      height: heightForZone(zone),
      color: colorForZone(zone),
      opacity: block.type === "warmup" || block.type === "cooldown" ? 0.88 : 1,
    });
  });

  return bars;
}

export function SessionStructurePreview({ blocks, className }: SessionStructurePreviewProps) {
  const profile = useMemo(() => buildPreviewBars(blocks), [blocks]);
  const totalWeight = profile.reduce((sum, item) => sum + item.weight, 0) || 1;

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
            key={`${index}-${bar.weight}-${bar.height}`}
            className="min-w-[6px] shrink-0 rounded-full shadow-sm"
            style={{
              flexBasis: `${(bar.weight / totalWeight) * 100}%`,
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