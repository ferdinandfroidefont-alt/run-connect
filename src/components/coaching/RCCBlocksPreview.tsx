import { Ruler, Clock } from "lucide-react";
import type { ParsedBlock } from "@/lib/rccParser";
import { computeRCCSummary, formatParsedBlockSummary } from "@/lib/rccParser";
import { useMemo } from "react";
import { aggregateRpeFromParsedBlocks, parseBlockRpeFromStorage, rpeChipColor } from "@/lib/sessionBlockRpe";
import { RpeBlockSliderRow } from "./BlockRpeSliders";

export interface RCCBlocksPreviewProps {
  blocks: ParsedBlock[];
  /** Édition : un RPE par bloc (0–10), même ordre que `blocks`. */
  blockRpe?: number[];
  onBlockRpeChange?: (next: number[]) => void;
  /** Lecture seule : JSON `rpe_phases` ou moyenne via `sessionRpeDisplay`. */
  sessionRpePhasesDisplay?: unknown;
  sessionRpeDisplay?: number | null;
}

export const RCCBlocksPreview = ({
  blocks,
  blockRpe,
  onBlockRpeChange,
  sessionRpePhasesDisplay,
  sessionRpeDisplay,
}: RCCBlocksPreviewProps) => {
  const summary = useMemo(() => computeRCCSummary(blocks), [blocks]);

  const readOnlyList = useMemo(() => {
    if (onBlockRpeChange) return null;
    return parseBlockRpeFromStorage(sessionRpePhasesDisplay, blocks.length);
  }, [onBlockRpeChange, sessionRpePhasesDisplay, blocks.length]);

  const readOnlyAvg = useMemo(() => {
    if (onBlockRpeChange) return null;
    if (readOnlyList && readOnlyList.length > 0) {
      return Math.round(readOnlyList.reduce((a, b) => a + b, 0) / readOnlyList.length);
    }
    if (typeof sessionRpeDisplay === "number" && sessionRpeDisplay >= 1 && sessionRpeDisplay <= 10) {
      return Math.round(sessionRpeDisplay);
    }
    return aggregateRpeFromParsedBlocks(blocks);
  }, [blocks, onBlockRpeChange, readOnlyList, sessionRpeDisplay]);

  if (!blocks?.length) return null;

  const editing = typeof onBlockRpeChange === "function" && Array.isArray(blockRpe);

  return (
    <div className="space-y-ios-2">
      {!editing && readOnlyList && readOnlyList.length === 0 && readOnlyAvg != null ? (
        <div className="flex flex-wrap items-center gap-ios-2">
          <span className="text-ios-footnote font-medium text-muted-foreground">RPE</span>
          <span
            className="rounded-ios-sm px-ios-2 py-0.5 text-ios-caption1 font-bold tabular-nums text-white"
            style={{ backgroundColor: rpeChipColor(readOnlyAvg) }}
          >
            {readOnlyAvg}
          </span>
        </div>
      ) : null}

      <p className="text-ios-footnote font-semibold uppercase tracking-wide text-muted-foreground">Aperçu</p>

      <div className="divide-y divide-border overflow-hidden rounded-ios-lg border border-border bg-card">
        {blocks.map((block, i) => (
          <div key={`${block.raw}-${i}`} className="space-y-ios-3 px-ios-3 py-ios-3">
            {editing ? (
              <RpeBlockSliderRow
                label={formatParsedBlockSummary(block)}
                value={blockRpe![i] ?? 5}
                onChange={(v) => {
                  const next = [...blockRpe!];
                  next[i] = v;
                  onBlockRpeChange!(next);
                }}
              />
            ) : (
              <div className="flex min-w-0 items-start justify-between gap-3">
                <p className="text-ios-subheadline leading-snug text-foreground min-w-0 flex-1">
                  {formatParsedBlockSummary(block)}
                </p>
                {readOnlyList && readOnlyList[i] != null ? (
                  <span
                    className="shrink-0 rounded-ios-sm px-ios-2 py-0.5 text-ios-caption1 font-bold tabular-nums text-white"
                    style={{
                      backgroundColor: rpeChipColor(Math.max(0, Math.min(10, readOnlyList[i]))),
                    }}
                  >
                    {readOnlyList[i]}
                  </span>
                ) : !readOnlyList && readOnlyAvg != null ? (
                  <span
                    className="shrink-0 rounded-ios-sm px-ios-2 py-0.5 text-ios-caption1 font-bold tabular-nums text-white"
                    style={{ backgroundColor: rpeChipColor(readOnlyAvg) }}
                  >
                    {readOnlyAvg}
                  </span>
                ) : null}
              </div>
            )}
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
