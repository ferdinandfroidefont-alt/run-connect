import { cn } from "@/lib/utils";
import type { MiniProfileBlock } from "@/lib/workoutVisualization";

interface MiniWorkoutProfileProps {
  blocks?: MiniProfileBlock[];
  compact?: boolean;
  isRestDay?: boolean;
  className?: string;
}

export function MiniWorkoutProfile({ blocks, compact = false, isRestDay = false, className }: MiniWorkoutProfileProps) {
  const profile = blocks?.length
    ? blocks
    : [{ width: 100, height: isRestDay ? 6 : compact ? 12 : 16, color: "hsl(var(--muted))", opacity: 0.8 }];

  return (
    <div
      className={cn(
        "flex w-full items-end gap-1 overflow-hidden rounded-xl bg-muted/55 px-2 py-2",
        compact ? "h-10" : "h-12",
        className
      )}
    >
      {isRestDay ? (
        <div className="h-0 w-full border-t border-dashed border-border/90" />
      ) : (
        profile.map((block, index) => (
          <span
            key={`${index}-${block.width}-${block.height}`}
            className="shrink-0 rounded-md"
            style={{
              width: `${Math.max(block.width, 6)}%`,
              minWidth: compact ? "8px" : "10px",
              height: `${block.height}px`,
              backgroundColor: block.color,
              opacity: block.opacity ?? 1,
            }}
          />
        ))
      )}
    </div>
  );
}