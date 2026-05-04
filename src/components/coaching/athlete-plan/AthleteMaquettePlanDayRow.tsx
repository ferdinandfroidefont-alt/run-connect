import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MiniProfileBlock } from "@/lib/workoutVisualization";
import { ATHLETE_PLAN_SPORT_SHORT, AthletePlanSportGlyph } from "@/components/coaching/athlete-plan/AthletePlanSportGlyph";
import { parseSport, sportLabel } from "@/components/coaching/athlete-plan/sportTokens";

export type AthleteMaquetteDayStatus = "done" | "today" | "planned" | "rest";

type Props = {
  dayAbbrev: string;
  dateNum: number;
  status: AthleteMaquetteDayStatus;
  sportKey: ReturnType<typeof parseSport> | null;
  title: string;
  distanceLabel?: string | null;
  durationLabel?: string | null;
  multiSessionHint?: string | null;
  miniProfile?: MiniProfileBlock[];
  onOpen?: () => void;
  onStart?: () => void;
};

/** Ligne journalière — alignée maquette 14 (apple-screens.jsx · AthleteDayRow). */
export function AthleteMaquettePlanDayRow({
  dayAbbrev,
  dateNum,
  status,
  sportKey,
  title,
  distanceLabel,
  durationLabel,
  multiSessionHint,
  miniProfile,
  onOpen,
  onStart,
}: Props) {
  const isRest = status === "rest";
  const isDone = status === "done";
  const isToday = status === "today";

  const isDiscipline =
    sportKey === "running" || sportKey === "cycling" || sportKey === "swimming" || sportKey === "strength";

  const glyphSport: "running" | "cycling" | "swimming" | "strength" | "rest" = isRest
    ? "rest"
    : isDiscipline
      ? sportKey
      : "strength";
  const glyphStroke = sportKey === "other" ? "#86868b" : undefined;

  const shortSport = isRest
    ? ATHLETE_PLAN_SPORT_SHORT.rest
    : sportKey && isDiscipline
      ? ATHLETE_PLAN_SPORT_SHORT[sportKey]
      : sportKey
        ? sportLabel(sportKey)
        : "";

  const subParts = [
    multiSessionHint || (!isRest && shortSport !== "Repos" ? shortSport : null),
    distanceLabel || (!isRest ? durationLabel : null),
  ].filter(Boolean);
  const subtitle = subParts.join(" · ");

  const rowPrimaryAction = () => {
    if (isToday && !isRest) return onOpen ?? onStart;
    return onOpen;
  };

  return (
    <div
      className={cn(
        "border-b border-[rgba(60,60,67,0.12)] px-4 py-3 last:border-b-0 dark:border-[rgba(84,84,88,0.4)]",
        isDone ? "opacity-70" : null
      )}
    >
      <div className="flex gap-3">
        <button
          type="button"
          disabled={rowPrimaryAction() == null}
          className="flex min-w-0 flex-1 gap-3 touch-manipulation text-left disabled:pointer-events-none disabled:opacity-100"
          onClick={() => {
            rowPrimaryAction()?.();
          }}
        >
          <div className="w-12 shrink-0">
            <div className="text-[11px] font-normal tracking-[0.3px] text-muted-foreground">{dayAbbrev}</div>
            <div
              className={cn(
                "font-display text-[22px] font-semibold leading-[1.05] tracking-[-0.02em]",
                isToday ? "text-[#0a84ff]" : "text-foreground"
              )}
            >
              {dateNum}
            </div>
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            {isRest ? (
              <>
                <div className="text-[16px] font-semibold tracking-[-0.3px] text-[rgba(60,60,67,0.4)] dark:text-muted-foreground/80">
                  Repos
                </div>
                <div className="mt-px text-[12px] leading-snug text-muted-foreground">Aucune séance prévue</div>
              </>
            ) : (
              <>
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="shrink-0" aria-hidden>
                    <AthletePlanSportGlyph sport={glyphSport} size={12} stroke={glyphStroke} />
                  </span>
                  <div className="truncate text-[16px] font-semibold tracking-[-0.3px] text-foreground">{title}</div>
                </div>
                {subtitle ? (
                  <div className="mt-px truncate text-[12px] leading-snug text-muted-foreground">{subtitle}</div>
                ) : null}
              </>
            )}
          </div>
        </button>
        <div className="flex shrink-0 items-center justify-center self-stretch pt-1">
          {isDone ? (
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full bg-[#34c759] text-[12px] font-bold leading-none text-white"
              aria-label="Réalisée"
              title="Réalisée"
            >
              ✓
            </span>
          ) : isToday && !isRest ? (
            <button type="button" className="apple-pill ml-px !h-8 shrink-0 px-3.5 text-[13px] font-semibold" onClick={onStart ?? onOpen}>
              Démarrer
            </button>
          ) : (
            <ChevronRight className="h-[18px] w-[18px] shrink-0 text-[rgba(60,60,67,0.3)] dark:text-muted-foreground/35" aria-hidden />
          )}
        </div>
      </div>
      {!isRest && miniProfile && miniProfile.length > 0 ? <AthletePlanBlockStrip blocks={miniProfile} /> : null}
    </div>
  );
}

function AthletePlanBlockStrip({ blocks }: { blocks: MiniProfileBlock[] }) {
  const total = blocks.reduce((acc, b) => acc + Math.max(b.width, 0), 0);
  const scale = total > 0 ? 1 : 0;
  return (
    <div className="ml-[60px] mt-2.5 flex min-h-[38px] items-end gap-0.5 rounded-lg bg-[rgba(120,120,128,0.08)] px-2 py-1">
      <div className="flex h-[22px] w-full items-end gap-0.5">
        {(total > 0 ? blocks : [{ width: 100, height: 10, color: "rgba(52,199,89,0.65)", opacity: 0.85 }]).map((b, i) => {
          const w = scale > 0 ? (Math.max(b.width, 0) / total) * 100 : 100;
          const h = typeof b.zoneBandLevel === "number"
            ? 8 + (b.zoneBandLevel / 6) * 14
            : Math.min(26, Math.max(10, resolveBlockPxHeight(b.height)));
          return (
            <span
              key={`${i}-${w}`}
              className="min-w-[2px] rounded-[2px]"
              style={{
                flexGrow: w,
                flexBasis: 0,
                height: `${h}px`,
                background:
                  b.shape === "slopeUp" || b.shape === "slopeDown"
                    ? b.gradientStartColor && b.gradientEndColor
                      ? `linear-gradient(90deg, ${b.gradientStartColor} 0%, ${b.gradientEndColor} 100%)`
                      : b.color
                    : b.color,
                opacity: b.opacity ?? 1,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function resolveBlockPxHeight(profileHeight: number): number {
  return Math.round(Math.max(8, Math.min(28, profileHeight * 1.05)));
}
