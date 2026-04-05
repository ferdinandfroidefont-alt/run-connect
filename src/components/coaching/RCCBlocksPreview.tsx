import { Ruler, Clock } from "lucide-react";
import type { ParsedBlock } from "@/lib/rccParser";
import { computeRCCSummary, formatParsedBlockSummary } from "@/lib/rccParser";
import { useMemo } from "react";
import {
  aggregateRpeFromParsedBlocks,
  averageFromRpePhases,
  normalizeSessionRpePhases,
  parseSessionRpePhases,
  rpeChipColor,
  type SessionRpePhases,
} from "@/lib/sessionBlockRpe";
import { RpePhaseStrip } from "./RpePhaseStrip";

export interface RCCBlocksPreviewProps {
  blocks: ParsedBlock[];
  /** Édition : RPE par phase */
  sessionRpePhases?: SessionRpePhases;
  onSessionRpePhasesChange?: (value: SessionRpePhases) => void;
  /** Lecture seule : phases en JSON ou moyenne via rpe global */
  sessionRpePhasesDisplay?: unknown;
  sessionRpeDisplay?: number | null;
}

export const RCCBlocksPreview = ({
  blocks,
  sessionRpePhases,
  onSessionRpePhasesChange,
  sessionRpePhasesDisplay,
  sessionRpeDisplay,
}: RCCBlocksPreviewProps) => {
  const summary = useMemo(() => computeRCCSummary(blocks), [blocks]);

  const readOnlyPhases = useMemo((): SessionRpePhases | null => {
    if (onSessionRpePhasesChange) return null;
    const parsed = parseSessionRpePhases(sessionRpePhasesDisplay);
    if (parsed && (parsed.warmup != null || parsed.main != null || parsed.cooldown != null)) {
      return normalizeSessionRpePhases(parsed);
    }
    return null;
  }, [onSessionRpePhasesChange, sessionRpePhasesDisplay]);

  const readOnlyAvg = useMemo(() => {
    if (onSessionRpePhasesChange) return null;
    if (readOnlyPhases) return averageFromRpePhases(readOnlyPhases);
    if (typeof sessionRpeDisplay === "number" && sessionRpeDisplay >= 1 && sessionRpeDisplay <= 10) {
      return Math.round(sessionRpeDisplay);
    }
    return aggregateRpeFromParsedBlocks(blocks);
  }, [blocks, onSessionRpePhasesChange, readOnlyPhases, sessionRpeDisplay]);

  if (!blocks?.length) return null;

  const editing = typeof onSessionRpePhasesChange === "function" && sessionRpePhases;

  return (
    <div className="space-y-ios-2">
      {editing ? (
        <div className="rounded-ios-lg border border-border bg-card p-ios-3">
          <p className="mb-ios-2 text-ios-footnote font-semibold uppercase tracking-wide text-muted-foreground">
            RPE
          </p>
          <RpePhaseStrip value={sessionRpePhases} onChange={onSessionRpePhasesChange} />
        </div>
      ) : readOnlyPhases ? (
        <div className="flex flex-wrap items-center gap-ios-2">
          <span className="text-ios-footnote font-medium text-muted-foreground">RPE</span>
          <span
            className="rounded-ios-sm px-ios-2 py-0.5 text-ios-caption1 font-bold tabular-nums text-white"
            style={{ backgroundColor: rpeChipColor(readOnlyPhases.warmup) }}
          >
            {readOnlyPhases.warmup}
          </span>
          <span className="text-muted-foreground">·</span>
          <span
            className="rounded-ios-sm px-ios-2 py-0.5 text-ios-caption1 font-bold tabular-nums text-white"
            style={{ backgroundColor: rpeChipColor(readOnlyPhases.main) }}
          >
            {readOnlyPhases.main}
          </span>
          <span className="text-muted-foreground">·</span>
          <span
            className="rounded-ios-sm px-ios-2 py-0.5 text-ios-caption1 font-bold tabular-nums text-white"
            style={{ backgroundColor: rpeChipColor(readOnlyPhases.cooldown) }}
          >
            {readOnlyPhases.cooldown}
          </span>
        </div>
      ) : readOnlyAvg != null ? (
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
