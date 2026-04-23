import { cn } from "@/lib/utils";
import type { MiniProfileBlock } from "@/lib/workoutVisualization";

interface MiniWorkoutProfileProps {
  blocks?: MiniProfileBlock[];
  compact?: boolean;
  isRestDay?: boolean;
  className?: string;
  variant?: "default" | "premiumCompact";
}

function resolveBlockHeight(height: number, variant: MiniWorkoutProfileProps["variant"]): number {
  if (variant !== "premiumCompact") return height;
  // Preserve hierarchy and keep a stronger visual delta for zone previews.
  return Math.max(5, Math.round(height * 0.74));
}

export function MiniWorkoutProfile({
  blocks,
  compact = false,
  isRestDay = false,
  className,
  variant = "default",
}: MiniWorkoutProfileProps) {
  const profile = blocks?.length
    ? blocks
    : [{ width: 100, height: isRestDay ? 6 : compact ? 12 : 16, color: "hsl(var(--muted))", opacity: 0.8 }];
  const blockGap = variant === "premiumCompact" ? 0 : 4;
  const availableWidth = 100 - blockGap * Math.max(0, profile.length - 1);
  const totalWidth = profile.reduce((acc, block) => acc + Math.max(block.width, 0), 0);
  const normalized = totalWidth > 0
    ? profile.map((block) => ({ ...block, width: (Math.max(block.width, 0) / totalWidth) * Math.max(availableWidth, 12) }))
    : profile;

  return (
    <div
      className={cn(
        "flex w-full overflow-hidden",
        variant === "premiumCompact"
          ? "items-end gap-0 rounded-[10px] border border-slate-100 bg-white px-0.5 py-0.5"
          : "items-center gap-1 rounded-xl bg-muted/45 px-2 py-2",
        compact ? (variant === "premiumCompact" ? "h-8" : "h-9") : variant === "premiumCompact" ? "h-12" : "h-10",
        className
      )}
    >
      {isRestDay ? (
        <div className="h-0 w-full border-t border-dashed border-border/90" />
      ) : (
        normalized.map((block, index) => {
          const resolvedHeight = resolveBlockHeight(block.height, variant);
          const isFineRecovery = variant === "premiumCompact" && resolvedHeight <= 7;
          return (
            <span
              key={`${index}-${block.width}-${block.height}`}
              className={cn(
                "min-w-0 shrink-0",
                variant === "premiumCompact"
                  ? "rounded-[1px]"
                  : "rounded-full"
              )}
              style={{
                flexGrow: Math.max(block.width, 0.001),
                flexBasis: 0,
                minWidth: compact ? (variant === "premiumCompact" ? "1px" : "3px") : variant === "premiumCompact" ? "1px" : "4px",
                height: `${resolvedHeight}px`,
                backgroundColor: block.color,
                opacity: isFineRecovery ? (block.opacity ?? 1) * 0.65 : (block.opacity ?? 1),
              }}
            />
          );
        })
      )}
    </div>
  );
}