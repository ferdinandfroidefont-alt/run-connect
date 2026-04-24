import { cn } from "@/lib/utils";
import type { MiniProfileBlock } from "@/lib/workoutVisualization";

interface MiniWorkoutProfileProps {
  blocks?: MiniProfileBlock[];
  compact?: boolean;
  isRestDay?: boolean;
  className?: string;
  variant?: "default" | "premiumCompact";
  barHeightScale?: number;
  /**
   * Barres = Z1 → 1/6 à Z6 → 100% de la hauteur utile, avec retrait haut/bas (ordonnée « vraie » 6 bandes).
   * Requiert `zoneBandLevel` sur chaque MiniProfileBlock (ex. `renderWorkoutMiniProfile(..., { sessionSchema: true })`).
   */
  zoneBandMode?: boolean;
  /** Espace entre barres (style Zwift), en px */
  interBlockGapPx?: number;
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
  barHeightScale = 1,
  zoneBandMode = false,
  interBlockGapPx,
}: MiniWorkoutProfileProps) {
  const profile = blocks?.length
    ? blocks
    : [{ width: 100, height: isRestDay ? 6 : compact ? 12 : 16, color: "hsl(var(--muted))", opacity: 0.8 }];

  const willUseZoneBands = zoneBandMode && profile.some((b) => b.zoneBandLevel != null);
  const gapPx = interBlockGapPx ?? (willUseZoneBands ? 3 : undefined);
  const useFlexGap = typeof gapPx === "number" && gapPx > 0;
  const blockGap = useFlexGap && willUseZoneBands ? 0 : variant === "premiumCompact" && !useFlexGap ? 0 : 4;
  const availableWidth = 100 - blockGap * Math.max(0, profile.length - 1);
  const totalWidth = profile.reduce((acc, block) => acc + Math.max(block.width, 0), 0);
  const normalized = totalWidth > 0
    ? profile.map((block) => ({ ...block, width: (Math.max(block.width, 0) / totalWidth) * Math.max(availableWidth, 12) }))
    : profile;

  const showZoneBands = willUseZoneBands;

  const barRow = (
    <>
      {isRestDay ? (
        <div className="h-0 w-full border-t border-dashed border-border/90" />
      ) : (
        normalized.map((block, index) => {
          const hasZone = block.zoneBandLevel != null && showZoneBands;
          const resolvedHeight = resolveBlockHeight(block.height, variant);
          const scaledHeight = Math.max(2, Math.round(resolvedHeight * barHeightScale));
          const isFineRecovery = variant === "premiumCompact" && scaledHeight <= 7 && !hasZone;
          return (
            <span
              key={`${index}-${block.width}-${block.height}-${block.zoneBandLevel ?? ""}`}
              className={cn(
                "min-w-0 shrink-0",
                variant === "premiumCompact" ? "rounded-[2px]" : "rounded-full"
              )}
              style={{
                flexGrow: Math.max(block.width, 0.001),
                flexBasis: 0,
                minWidth: compact ? (variant === "premiumCompact" ? "1px" : "3px") : variant === "premiumCompact" ? "1px" : "4px",
                ...(hasZone
                  ? {
                      height: `${(block.zoneBandLevel! / 6) * 100}%`,
                      minHeight: 0,
                      maxHeight: `${(block.zoneBandLevel! / 6) * 100}%`,
                      backgroundColor: block.color,
                      opacity: isFineRecovery ? (block.opacity ?? 1) * 0.65 : (block.opacity ?? 1),
                    }
                  : {
                      height: `${scaledHeight}px`,
                      backgroundColor: block.color,
                      opacity: isFineRecovery ? (block.opacity ?? 1) * 0.65 : (block.opacity ?? 1),
                    }),
              }}
            />
          );
        })
      )}
    </>
  );

  if (showZoneBands) {
    return (
      <div
        className={cn(
          "flex h-full min-h-0 w-full flex-col overflow-hidden",
          variant === "premiumCompact"
            ? "rounded-[10px] border border-slate-100 bg-white"
            : "rounded-xl bg-muted/45",
          className
        )}
      >
        <div
          className={cn(
            "flex min-h-0 w-full flex-1 flex-col justify-end",
            "pt-1.5 pb-2.5",
            variant === "premiumCompact" ? "px-0.5" : "px-2"
          )}
        >
          <div
            className="flex min-h-0 w-full flex-1 items-end"
            style={useFlexGap && gapPx != null ? { gap: gapPx } : { gap: 0 }}
          >
            {barRow}
          </div>
        </div>
      </div>
    );
  }

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
      {barRow}
    </div>
  );
}
