import { Flame, Zap, Activity, Snowflake, RotateCcw, Ruler, Clock, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { ParsedBlock } from "@/lib/rccParser";
import { computeRCCSummary } from "@/lib/rccParser";
import { useMemo } from "react";

const BLOCK_CONFIG: Record<string, { icon: React.ElementType; label: string; bg: string; text: string }> = {
  warmup: { icon: Flame, label: "Échauffement", bg: "bg-green-500/10", text: "text-green-600" },
  interval: { icon: Zap, label: "Fractionné", bg: "bg-red-500/10", text: "text-red-600" },
  steady: { icon: Activity, label: "Bloc constant", bg: "bg-blue-500/10", text: "text-blue-600" },
  cooldown: { icon: Snowflake, label: "Retour au calme", bg: "bg-emerald-500/10", text: "text-emerald-600" },
  recovery: { icon: RotateCcw, label: "Récupération", bg: "bg-gray-500/10", text: "text-gray-500" },
};

const INTENSITY_CONFIG: Record<string, { bg: string; text: string }> = {
  'Facile': { bg: 'bg-green-500/10', text: 'text-green-600' },
  'Modérée': { bg: 'bg-yellow-500/10', text: 'text-yellow-600' },
  'Intense': { bg: 'bg-orange-500/10', text: 'text-orange-600' },
  'Très intense': { bg: 'bg-red-500/10', text: 'text-red-600' },
};

export const RCCBlocksPreview = ({ blocks }: { blocks: ParsedBlock[] }) => {
  const summary = useMemo(() => computeRCCSummary(blocks), [blocks]);

  // Auto-generated tags based on block types
  const tags = useMemo(() => {
    if (!blocks || blocks.length === 0) return [];
    const result: { label: string; className: string }[] = [];
    const types = new Set(blocks.map(b => b.type));

    if (types.has("warmup") || types.has("steady")) {
      result.push({ label: "EF", className: "bg-green-500/15 text-green-600 border-green-500/20" });
    }
    if (types.has("interval")) {
      // Determine VMA vs Seuil from pace
      const intervalBlock = blocks.find(b => b.type === "interval");
      const pace = intervalBlock?.pace || "";
      const paceMin = parseInt(pace.split("'")[0] || "0");
      if (paceMin > 0 && paceMin <= 3) {
        result.push({ label: "VMA", className: "bg-red-500/15 text-red-600 border-red-500/20" });
      } else if (paceMin > 3 && paceMin <= 4) {
        result.push({ label: "Seuil", className: "bg-orange-500/15 text-orange-600 border-orange-500/20" });
      } else {
        result.push({ label: "VMA", className: "bg-red-500/15 text-red-600 border-red-500/20" });
      }
    }
    if (types.has("cooldown")) {
      result.push({ label: "Récup", className: "bg-blue-500/15 text-blue-600 border-blue-500/20" });
    }
    return result;
  }, [blocks]);

  if (!blocks || blocks.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {/* Auto tags */}
      {tags.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mb-1">
          {tags.map(tag => (
            <span
              key={tag.label}
              className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", tag.className)}
            >
              {tag.label}
            </span>
          ))}
        </div>
      )}

      {/* Volume summary bar */}
      <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 text-xs font-medium">
        <span className="flex items-center gap-1">
          <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
          {summary.totalDistanceKm} km
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          {summary.totalDurationMin} min
        </span>
        <span className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded", INTENSITY_CONFIG[summary.intensity]?.bg, INTENSITY_CONFIG[summary.intensity]?.text)}>
          <TrendingUp className="h-3.5 w-3.5" />
          {summary.intensity}
        </span>
      </div>

      <p className="text-xs font-medium text-muted-foreground uppercase">Aperçu</p>
      {blocks.map((block, i) => {
        const config = BLOCK_CONFIG[block.type] || BLOCK_CONFIG.steady;
        const Icon = config.icon;

        return (
          <div key={i} className={cn("flex items-center gap-2 p-2 rounded-lg", config.bg)}>
            <Icon className={cn("h-4 w-4 shrink-0", config.text)} />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium">{config.label}</span>
              <span className="text-xs text-muted-foreground ml-2">
                {block.type === "interval"
                  ? `${block.repetitions || "?"}×${block.distance || "?"}m @ ${block.pace || "?"}`
                  : `${block.duration || "?"}min${block.pace ? ` @ ${block.pace}` : ""}`}
              </span>
              {block.recoveryDuration && (
                <span className="text-xs text-muted-foreground ml-2">
                  — récup {Math.floor(block.recoveryDuration / 60)}'{String(block.recoveryDuration % 60).padStart(2, '0')} {block.recoveryType || "trot"}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
