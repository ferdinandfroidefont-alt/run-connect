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
  const totalWidth = profile.reduce((acc, block) => acc + Math.max(block.width, 0), 0);
  const normalized = totalWidth > 0
    ? profile.map((block) => ({ ...block, width: (block.width / totalWidth) * 100 }))
    : profile;

  return (
    <div
      className={cn(
        "flex w-full items-center gap-1 overflow-hidden rounded-xl bg-muted/45 px-2 py-2",
        compact ? "h-9" : "h-10",
        className
      )}
    >
      {isRestDay ? (
        <div className="h-0 w-full border-t border-dashed border-border/90" />
      ) : (
        normalized.map((block, index) => (
          <span
            key={`${index}-${block.width}-${block.height}`}
            className="min-w-0 shrink rounded-md"
            style={{
              flexBasis: `${Math.max(block.width, 2)}%`,
              minWidth: compact ? "3px" : "4px",
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