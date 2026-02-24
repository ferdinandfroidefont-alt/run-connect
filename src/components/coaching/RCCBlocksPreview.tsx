import { Flame, Zap, Activity, Snowflake, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ParsedBlock } from "@/lib/rccParser";

const BLOCK_CONFIG: Record<string, { icon: React.ElementType; label: string; bg: string; text: string }> = {
  warmup: { icon: Flame, label: "Échauffement", bg: "bg-green-500/10", text: "text-green-600" },
  interval: { icon: Zap, label: "Fractionné", bg: "bg-red-500/10", text: "text-red-600" },
  steady: { icon: Activity, label: "Bloc constant", bg: "bg-blue-500/10", text: "text-blue-600" },
  cooldown: { icon: Snowflake, label: "Retour au calme", bg: "bg-emerald-500/10", text: "text-emerald-600" },
  recovery: { icon: RotateCcw, label: "Récupération", bg: "bg-gray-500/10", text: "text-gray-500" },
};

export const RCCBlocksPreview = ({ blocks }: { blocks: ParsedBlock[] }) => {
  if (!blocks || blocks.length === 0) return null;

  return (
    <div className="space-y-1.5">
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
