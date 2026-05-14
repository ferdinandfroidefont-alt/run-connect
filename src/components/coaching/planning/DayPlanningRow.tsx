import { DayEmptyStateInline } from "@/components/coaching/planning/DayEmptyStateInline";
import { DaySessionSummary, type SessionSummaryView } from "@/components/coaching/planning/DaySessionSummary";
import { SessionActionMenu } from "@/components/coaching/planning/SessionActionMenu";
import { SessionStatusAction } from "@/components/coaching/planning/SessionStatusAction";
import { MiniWorkoutProfile } from "@/components/coaching/MiniWorkoutProfile";
import { cn } from "@/lib/utils";
import type { MiniProfileBlock } from "@/lib/workoutVisualization";
import { Bike, Check, ChevronRight, Clock, Clock3, Dumbbell, Footprints, Moon, Plus, Ruler, Waves } from "lucide-react";

/** Barres schéma — `MonPlanTimeline` · RunConnect (7).jsx (`SchemaBars`). */
const MAQUETTE_ACTION_BLUE = "#007AFF";
const MAQUETTE_ORANGE = "#FF9500";

function MonPlanSchemaBars({ blocks }: { blocks: MiniProfileBlock[] }) {
  if (!blocks.length) return null;
  return (
    <div className="mt-3 flex h-14 items-end gap-[2px] px-1">
      {blocks.map((block, i) => {
        const inferred = Math.max(1, Math.min(6, Math.round((block.height / 24) * 5) + 1));
        const band: number = typeof block.zoneBandLevel === "number" ? block.zoneBandLevel : inferred;
        const heightFrac = band / 6;
        const useBlue = band <= 3;
        return (
          <div
            key={`${i}-${block.width}-${block.zoneBandLevel ?? ""}`}
            className="min-w-0 rounded-sm"
            style={{
              flexGrow: Math.max(block.width, 0.0001),
              flexBasis: 0,
              height: `${heightFrac * 100}%`,
              background: useBlue ? MAQUETTE_ACTION_BLUE : MAQUETTE_ORANGE,
            }}
          />
        );
      })}
    </div>
  );
}

interface DayPlanningRowProps {
  dayLabel: string;
  dateLabel: string;
  isSelected?: boolean;
  session?: SessionSummaryView;
  isSent?: boolean;
  accentColor?: string;
  emptyLabel?: string;
  onAdd: () => void;
  onOpen?: () => void;
  onEdit?: () => void;
  onSend?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onUnsend?: () => void;
  allowSessionActions?: boolean;
  hideActionSlot?: boolean;
  /** Maquette 16 · ligne plan coach (colonnes 48px / flex / action). */
  layoutVariant?: "default" | "coachWeek" | "athleteTimeline";
  /** Jour courant — fond bleu clair + bande latérale (maquette Mon plan). */
  isToday?: boolean;
  /** Dernière ligne du groupe : pas de filet inférieur (coachWeek). */
  isLast?: boolean;
  /** Athlète ciblé : participation « completed » (maquette 16). */
  athleteSessionCompleted?: boolean;
}

function CoachSportIcon({ sport }: { sport: NonNullable<SessionSummaryView["sportHint"]> }) {
  const cnIco = "h-3 w-3 shrink-0";
  switch (sport) {
    case "running":
      return <Footprints className={cnIco} strokeWidth={2} aria-hidden />;
    case "cycling":
      return <Bike className={cnIco} strokeWidth={2} aria-hidden />;
    case "swimming":
      return <Waves className={cnIco} strokeWidth={2} aria-hidden />;
    case "strength":
      return <Dumbbell className={cnIco} strokeWidth={2} aria-hidden />;
    default:
      return <Moon className={cnIco} strokeWidth={2} aria-hidden />;
  }
}

export function DayPlanningRow({
  dayLabel,
  dateLabel,
  isSelected = false,
  session,
  isSent = false,
  accentColor = "#9CA3AF",
  emptyLabel,
  onAdd,
  onOpen,
  onEdit,
  onSend,
  onDuplicate,
  onDelete,
  onUnsend,
  allowSessionActions = true,
  hideActionSlot = false,
  layoutVariant = "default",
  isLast = false,
  isToday = false,
  athleteSessionCompleted = false,
}: DayPlanningRowProps) {
  const coachWeek = layoutVariant === "coachWeek";
  const athleteTimeline = layoutVariant === "athleteTimeline";
  const dayAbbrev = dayLabel.slice(0, 3).toUpperCase();
  const maquetteBlue = "#007AFF";

  if (athleteTimeline) {
    const isRest = session?.isRestDay;

    return (
      <div
        className={cn("relative flex items-stretch gap-3 px-5 py-2", isToday && !isRest && "rounded-none")}
        style={isToday ? { background: "#E5F0FF" } : undefined}
      >
        {isToday ? (
          <div
            className="pointer-events-none absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r"
            style={{ background: maquetteBlue }}
            aria-hidden
          />
        ) : null}

        <div className="flex w-11 shrink-0 flex-col justify-center">
          <p
            className="text-[11px] font-bold tracking-wide"
            style={{ color: isToday ? maquetteBlue : "#8E8E93" }}
          >
            {dayAbbrev}
          </p>
          <p
            className="text-[26px] font-extrabold leading-none tracking-tight"
            style={{ color: isToday ? maquetteBlue : "#0A0F1F" }}
          >
            {dateLabel}
          </p>
        </div>

        <div className="min-w-0 flex-1">
          {!session || isRest ? (
            <div className="flex min-h-[56px] flex-1 items-center justify-center rounded-2xl border-2 border-dashed border-[#C7C7CC] px-4 py-5">
              <p className="text-[15px] font-semibold text-[#8E8E93]">{emptyLabel ?? "Repos"}</p>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpen}
              className="w-full min-w-0 overflow-hidden rounded-2xl bg-white p-3 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-transform active:scale-[0.98]"
            >
              <div className="flex items-center justify-between border-b border-[#F2F2F7] pb-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  <Footprints className="h-4 w-4 shrink-0 text-[#007AFF]" strokeWidth={2.4} aria-hidden />
                  <p className="truncate text-[15px] font-bold text-[#0A0F1F]">Détail</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-[#C7C7CC]" aria-hidden />
              </div>
              {session.miniProfile?.length ? <MonPlanSchemaBars blocks={session.miniProfile} /> : null}
              <p className="mt-2 truncate text-[16px] font-bold text-[#0A0F1F]">{session.title}</p>
              <div className="mt-1 flex items-center gap-3 text-[13px] text-[#8E8E93]">
                {session.duration ? (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                    {session.duration}
                  </span>
                ) : null}
                {session.distance ? (
                  <span className="inline-flex items-center gap-1">
                    <Ruler className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                    {session.distance}
                  </span>
                ) : null}
              </div>
            </button>
          )}
        </div>
      </div>
    );
  }

  if (coachWeek) {
    const isRest = session?.isRestDay;
    const rowAccent = accentColor;
    const dayNumber = dateLabel;
    const maquetteBlue = "#007AFF";

    const addMaquetteButton = (
      <button
        type="button"
        onClick={onAdd}
        className={cn(
          "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white shadow-[0_2px_6px_rgba(0,122,255,0.3)] transition-transform active:scale-90 dark:shadow-[0_2px_6px_rgba(10,132,255,0.35)]",
          !allowSessionActions && "pointer-events-none opacity-45"
        )}
        style={{ backgroundColor: maquetteBlue }}
        aria-label="Ajouter une séance"
      >
        <Plus className="h-5 w-5" strokeWidth={2.8} aria-hidden />
      </button>
    );

    return (
      <div
        className={cn(
          "flex items-center gap-2.5 rounded-2xl transition-colors",
          isToday && "-mx-2 bg-[#E5F0FF] py-1 pl-1 pr-2 dark:bg-[#1a2535]"
        )}
      >
        <div
          className={cn(
            "flex w-[52px] shrink-0 flex-col items-center justify-center rounded-xl px-1 py-2",
            isToday ? "bg-[#CDE2FF] dark:bg-[#243047]" : "bg-transparent"
          )}
        >
          <p
            className="text-[10px] font-extrabold tracking-wider"
            style={{ color: isToday ? maquetteBlue : "#8E8E93" }}
          >
            {dayAbbrev}
          </p>
          <p
            className="mt-1 text-[26px] font-extrabold leading-none tracking-tight"
            style={{ color: isToday ? maquetteBlue : "#0A0F1F" }}
          >
            {dayNumber}
          </p>
        </div>

        <div className="min-w-0 flex-1">
          {!session || isRest ? (
            <div className="flex min-h-[56px] flex-1 items-center justify-center rounded-2xl border-[1.5px] border-dashed border-[#C7C7CC] bg-transparent px-3 py-4 dark:border-muted-foreground/40">
              <p className="text-[15px] font-semibold text-[#8E8E93]">{emptyLabel ?? "Repos"}</p>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpen}
              className="w-full min-w-0 overflow-hidden rounded-2xl border border-black/[0.06] bg-white text-left shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-border dark:bg-card"
            >
              <div className="flex items-center justify-between border-b border-[#F2F2F7] px-3 py-2.5 dark:border-border">
                <div className="flex min-w-0 items-center gap-1.5 text-[14px] font-semibold text-[#0A0F1F] dark:text-foreground">
                  {session.sportHint ? (
                    <span style={{ color: rowAccent }}>
                      <CoachSportIcon sport={session.sportHint} />
                    </span>
                  ) : null}
                  <span className="truncate">Détail</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#C7C7CC]" aria-hidden />
              </div>
              <div className="px-3 pb-3 pt-3">
                {session.miniProfile?.length ? (
                  <div className="mb-2 h-12 px-1">
                    <MiniWorkoutProfile
                      blocks={session.miniProfile}
                      isRestDay={false}
                      compact
                      variant="premiumCompact"
                      zoneBandMode
                      className="h-full w-full rounded-none border-0 bg-transparent px-0 py-0"
                    />
                  </div>
                ) : null}
                <p className="truncate text-[15px] font-semibold tracking-[-0.02em] text-[#0A0F1F] dark:text-foreground">{session.title}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[12px] text-[#8E8E93]">
                  {session.duration ? (
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3 w-3 shrink-0" aria-hidden />
                      <span className="font-semibold text-[#0A0F1F]/85 dark:text-foreground/85">{session.duration}</span>
                    </span>
                  ) : null}
                  {session.distance ? (
                    <span className="inline-flex items-center gap-1">
                      <Ruler className="h-3 w-3 shrink-0" aria-hidden />
                      <span className="font-semibold text-[#0A0F1F]/85 dark:text-foreground/85">{session.distance}</span>
                    </span>
                  ) : null}
                  {athleteSessionCompleted ? (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-[#34C759]/12 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#248a3d] dark:text-[#34C759]">
                      <Check className="h-2.5 w-2.5 stroke-[2.8]" aria-hidden />
                      Fait
                    </span>
                  ) : null}
                </div>
              </div>
            </button>
          )}
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center">
          {hideActionSlot ? null : !session ? (
            addMaquetteButton
          ) : isRest ? (
            addMaquetteButton
          ) : isSent ? (
            <div className={cn(!allowSessionActions && "pointer-events-none opacity-45")}>
              <SessionStatusAction mode="sent" onSentClick={onUnsend} />
            </div>
          ) : (
            <div className={cn(!allowSessionActions && "pointer-events-none opacity-45")}>
              <SessionActionMenu onSend={onSend || onAdd} onDuplicate={onDuplicate || onAdd} onDelete={onDelete || onAdd} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border-b border-border bg-card px-4 py-3 transition-colors",
        isSelected && "bg-secondary/40"
      )}
    >
      <div className="grid grid-cols-[80px_minmax(0,1fr)_44px] items-center gap-2.5">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold capitalize text-foreground">{dayLabel}</p>
          <p className="truncate text-[11px] text-muted-foreground">{dateLabel}</p>
        </div>

        {session ? (
          <button type="button" onClick={onOpen} className="min-w-0 text-left">
            <DaySessionSummary summary={session} accentColor={accentColor} />
          </button>
        ) : (
          <DayEmptyStateInline label={emptyLabel} />
        )}

        <div className="flex items-center justify-end">
          {hideActionSlot ? null : !session ? (
            <div className={!allowSessionActions ? "pointer-events-none opacity-45" : undefined}>
              <SessionStatusAction mode="add" onAdd={onAdd} />
            </div>
          ) : isSent ? (
            <div className={!allowSessionActions ? "pointer-events-none opacity-45" : undefined}>
              <SessionStatusAction mode="sent" onSentClick={onUnsend} />
            </div>
          ) : (
            <div className={!allowSessionActions ? "pointer-events-none opacity-45" : undefined}>
              <SessionActionMenu onSend={onSend || onAdd} onDuplicate={onDuplicate || onAdd} onDelete={onDelete || onAdd} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
