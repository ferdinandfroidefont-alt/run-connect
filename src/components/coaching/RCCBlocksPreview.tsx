import { Ruler, Clock, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ParsedBlock } from "@/lib/rccParser";
import { computeRCCSummary, formatParsedBlockSummary } from "@/lib/rccParser";
import { useMemo } from "react";
import { rpeChipColor } from "@/lib/sessionBlockRpe";

const TYPE_LABELS: Record<string, string> = {
  warmup: "Échauffement",
  interval: "Fractionné",
  steady: "Bloc constant",
  cooldown: "Retour au calme",
  recovery: "Récupération",
};

const INTENSITY_CONFIG: Record<string, { bg: string; text: string }> = {
  Facile: { bg: "bg-green-500/10", text: "text-green-600" },
  Modérée: { bg: "bg-yellow-500/10", text: "text-yellow-600" },
  Intense: { bg: "bg-orange-500/10", text: "text-orange-600" },
  "Très intense": { bg: "bg-red-500/10", text: "text-red-600" },
};

function RpeRow({
  label,
  value,
  onChange,
  compact,
}: {
  label: string;
  value?: number;
  onChange: (v: number | undefined) => void;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex flex-col gap-ios-1", compact && "mt-ios-1")}>
      <span className="text-ios-caption2 text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-0.5">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? undefined : n)}
            className={cn(
              "h-7 min-w-[26px] px-1 rounded-ios-sm text-[11px] font-semibold transition-colors touch-manipulation",
              value === n ? "text-white shadow-sm" : "bg-secondary text-muted-foreground active:scale-95"
            )}
            style={value === n ? { backgroundColor: rpeChipColor(n) } : undefined}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

interface RCCBlocksPreviewProps {
  blocks: ParsedBlock[];
  /** Affiche les sélecteurs RPE par bloc (coach) */
  editableRpe?: boolean;
  onRpeChange?: (index: number, payload: { rpe?: number; recoveryRpe?: number }) => void;
}

export const RCCBlocksPreview = ({ blocks, editableRpe, onRpeChange }: RCCBlocksPreviewProps) => {
  const summary = useMemo(() => computeRCCSummary(blocks), [blocks]);

  const tags = useMemo(() => {
    if (!blocks?.length) return [];
    const result: { label: string; className: string }[] = [];
    const types = new Set(blocks.map((b) => b.type));
    if (types.has("warmup") || types.has("steady")) {
      result.push({ label: "EF", className: "bg-green-500/12 text-green-700 dark:text-green-400 border border-green-500/20" });
    }
    if (types.has("interval")) {
      const intervalBlock = blocks.find((b) => b.type === "interval");
      const pace = intervalBlock?.pace || "";
      const paceMin = parseInt(pace.split(/[:']/)[0] || "0", 10);
      if (paceMin > 0 && paceMin <= 3) {
        result.push({ label: "VMA", className: "bg-red-500/12 text-red-700 dark:text-red-400 border border-red-500/20" });
      } else if (paceMin > 3 && paceMin <= 4) {
        result.push({ label: "Seuil", className: "bg-orange-500/12 text-orange-700 dark:text-orange-400 border border-orange-500/20" });
      } else {
        result.push({ label: "Intervalles", className: "bg-red-500/12 text-red-700 dark:text-red-400 border border-red-500/20" });
      }
    }
    if (types.has("cooldown")) {
      result.push({ label: "Récup", className: "bg-blue-500/12 text-blue-700 dark:text-blue-400 border border-blue-500/20" });
    }
    return result;
  }, [blocks]);

  if (!blocks?.length) return null;

  return (
    <div className="space-y-ios-2">
      {tags.length > 0 && (
        <div className="flex gap-ios-1.5 flex-wrap">
          {tags.map((tag) => (
            <span
              key={tag.label}
              className={cn("text-ios-caption2 font-semibold px-ios-2 py-0.5 rounded-full", tag.className)}
            >
              {tag.label}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-ios-3 p-ios-2 rounded-ios-lg bg-secondary/60 text-ios-footnote font-medium">
        <span className="flex items-center gap-ios-1 text-muted-foreground">
          <Ruler className="h-3.5 w-3.5 shrink-0" />
          {summary.totalDistanceKm} km
        </span>
        <span className="flex items-center gap-ios-1 text-muted-foreground">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          {summary.totalDurationMin} min
        </span>
        <span
          className={cn(
            "flex items-center gap-ios-1 px-ios-1.5 py-0.5 rounded-ios-sm text-ios-caption1",
            INTENSITY_CONFIG[summary.intensity]?.bg,
            INTENSITY_CONFIG[summary.intensity]?.text
          )}
        >
          <TrendingUp className="h-3.5 w-3.5 shrink-0" />
          {summary.intensity}
        </span>
      </div>

      <p className="text-ios-footnote font-semibold text-muted-foreground uppercase tracking-wide">Aperçu</p>

      <div className="rounded-ios-lg border border-border divide-y divide-border overflow-hidden bg-card">
        {blocks.map((block, i) => {
          const typeLabel = TYPE_LABELS[block.type] || "Segment";
          const line = formatParsedBlockSummary(block);

          return (
            <div key={`${block.raw}-${i}`} className="px-ios-3 py-ios-3">
              <div className="flex flex-col gap-0.5">
                <div className="flex flex-wrap items-baseline gap-x-ios-2 gap-y-0.5">
                  <span className="text-ios-footnote font-semibold text-foreground">{typeLabel}</span>
                  {typeof block.rpe === "number" && !editableRpe && (
                    <span
                      className="text-ios-caption1 font-bold text-white rounded-ios-sm px-ios-1.5 py-0.5 tabular-nums"
                      style={{ backgroundColor: rpeChipColor(block.rpe) }}
                    >
                      RPE {block.rpe}
                    </span>
                  )}
                </div>
                <p className="text-ios-subheadline text-foreground leading-snug">{line}</p>
                {block.type === "interval" && block.recoveryDuration && typeof block.recoveryRpe === "number" && !editableRpe && (
                  <p className="text-ios-caption1 text-muted-foreground mt-ios-1">
                    RPE récup entre reps :{" "}
                    <span className="font-semibold text-foreground tabular-nums">{block.recoveryRpe}</span>
                  </p>
                )}
              </div>

              {editableRpe && onRpeChange && (
                <div className="mt-ios-3 pt-ios-3 border-t border-border/60 space-y-ios-3">
                  <RpeRow
                    label="RPE — effort de ce segment"
                    value={block.rpe}
                    onChange={(v) => onRpeChange(i, { rpe: v, recoveryRpe: block.recoveryRpe })}
                  />
                  {block.type === "interval" && block.recoveryDuration ? (
                    <RpeRow
                      label="RPE — récup entre les répétitions"
                      value={block.recoveryRpe}
                      onChange={(v) => onRpeChange(i, { rpe: block.rpe, recoveryRpe: v })}
                    />
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
