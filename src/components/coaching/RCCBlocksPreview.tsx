import { Ruler, Clock } from "lucide-react";
import type { ParsedBlock } from "@/lib/rccParser";
import { computeRCCSummary, formatParsedBlockSummary } from "@/lib/rccParser";
import { useMemo } from "react";
import { aggregateRpeFromParsedBlocks, rpeChipColor } from "@/lib/sessionBlockRpe";
import { RpeSessionSlider } from "./RpeSessionSlider";

export interface RCCBlocksPreviewProps {
  blocks: ParsedBlock[];
  /** Édition : un seul RPE pour toute la séance */
  sessionRpe?: number;
  onSessionRpeChange?: (value: number) => void;
  /** Lecture seule : RPE global (ex. coaching_sessions.rpe) ; sinon repli sur blocs historiques */
  sessionRpeDisplay?: number | null;
}

export const RCCBlocksPreview = ({
  blocks,
  sessionRpe,
  onSessionRpeChange,
  sessionRpeDisplay,
}: RCCBlocksPreviewProps) => {
  const summary = useMemo(() => computeRCCSummary(blocks), [blocks]);

  const readOnlyRpe = useMemo(() => {
    if (!onSessionRpeChange) {
      if (typeof sessionRpeDisplay === "number" && sessionRpeDisplay >= 1 && sessionRpeDisplay <= 10) {
        return Math.round(sessionRpeDisplay);
      }
      return aggregateRpeFromParsedBlocks(blocks);
    }
    return null;
  }, [blocks, onSessionRpeChange, sessionRpeDisplay]);

  if (!blocks?.length) return null;

  const editing = typeof onSessionRpeChange === "function";
  const sliderValue = typeof sessionRpe === "number" ? Math.min(10, Math.max(1, sessionRpe)) : 5;

  return (
    <div className="space-y-ios-2">
      {editing ? (
        <div className="rounded-ios-lg border border-border bg-card p-ios-3">
          <p className="text-ios-subheadline font-semibold text-foreground">RPE global</p>
          <p className="mt-ios-1 text-ios-footnote leading-snug text-muted-foreground">
            Un niveau pour toute la séance (1 = très facile, 10 = maximal).
          </p>
          <div className="mt-ios-3">
            <RpeSessionSlider value={sliderValue} onChange={onSessionRpeChange} />
          </div>
        </div>
      ) : readOnlyRpe != null ? (
        <div className="flex flex-wrap items-center gap-ios-2">
          <span className="text-ios-footnote font-medium text-muted-foreground">RPE prévu</span>
          <span
            className="rounded-ios-sm px-ios-2 py-0.5 text-ios-caption1 font-bold tabular-nums text-white"
            style={{ backgroundColor: rpeChipColor(readOnlyRpe) }}
          >
            {readOnlyRpe}
          </span>
        </div>
      ) : null}

      <p className="text-ios-footnote font-semibold uppercase tracking-wide text-muted-foreground">Aperçu</p>

      <div className="divide-y divide-border overflow-hidden rounded-ios-lg border border-border bg-card">
        {blocks.map((block, i) => (
          <div key={`${block.raw}-${i}`} className="px-ios-3 py-ios-3">
            <p className="text-ios-subheadline leading-snug text-foreground">{formatParsedBlockSummary(block)}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-ios-3 text-ios-caption1 font-medium text-muted-foreground">
        <span className="flex items-center gap-ios-1">
          <Ruler className="h-3.5 w-3.5 shrink-0" />
          {summary.totalDistanceKm} km
        </span>
        <span className="flex items-center gap-ios-1">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          {summary.totalDurationMin} min
        </span>
      </div>
    </div>
  );
};
