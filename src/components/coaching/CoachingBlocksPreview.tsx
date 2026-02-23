import { Flame, Zap, Activity, Snowflake } from "lucide-react";
import { cn } from "@/lib/utils";

interface Block {
  type: string;
  duration?: string;
  intensity?: string;
  pace?: string;
  repetitions?: number;
  effortDuration?: string;
  effortPace?: string;
  recoveryDuration?: string;
  recoveryType?: string;
}

const BLOCK_CONFIG: Record<string, { icon: React.ElementType; label: string; bg: string; text: string }> = {
  warmup: { icon: Flame, label: "Échauffement", bg: "bg-green-500/10", text: "text-green-600" },
  interval: { icon: Zap, label: "Fractionné", bg: "bg-orange-500/10", text: "text-orange-600" },
  steady: { icon: Activity, label: "Bloc constant", bg: "bg-blue-500/10", text: "text-blue-600" },
  cooldown: { icon: Snowflake, label: "Retour au calme", bg: "bg-purple-500/10", text: "text-purple-600" },
};

export const CoachingBlocksPreview = ({ blocks }: { blocks: Block[] }) => {
  if (!blocks || blocks.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground uppercase">Structure</p>
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
                  ? `${block.repetitions || "?"}x${block.effortDuration || "?"}m${block.effortPace ? ` @ ${block.effortPace}` : ""} — récup ${block.recoveryDuration || "?"}s`
                  : `${block.duration || "?"}min${block.pace ? ` @ ${block.pace}` : ""}`}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
