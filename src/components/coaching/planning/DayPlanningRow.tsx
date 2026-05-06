import { DayEmptyStateInline } from "@/components/coaching/planning/DayEmptyStateInline";
import { DaySessionSummary, type SessionSummaryView } from "@/components/coaching/planning/DaySessionSummary";
import { SessionActionMenu } from "@/components/coaching/planning/SessionActionMenu";
import { SessionStatusAction } from "@/components/coaching/planning/SessionStatusAction";
import { MiniWorkoutProfile } from "@/components/coaching/MiniWorkoutProfile";
import { cn } from "@/lib/utils";
import { Bike, Check, ChevronRight, Clock3, Dumbbell, Footprints, Moon, Plus, Ruler, Waves } from "lucide-react";

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
  layoutVariant?: "default" | "coachWeek";
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
  athleteSessionCompleted = false,
}: DayPlanningRowProps) {
  const coachWeek = layoutVariant === "coachWeek";
  const dayAbbrev = dayLabel.slice(0, 3).toUpperCase();

  if (coachWeek) {
    const isRest = session?.isRestDay;
    const rowAccent = accentColor;
    const dayNumber = dateLabel;

    return (
      <div
        className={cn(
          "grid grid-cols-[36px_minmax(0,1fr)_36px] items-stretch gap-2.5 px-3.5 py-1.5 transition-colors",
          isSelected && "bg-[rgba(0,122,255,0.05)]"
        )}
      >
        <div
          className={cn(
            "flex flex-col items-center gap-0.5 px-0 py-2.5",
            isSelected && "rounded-xl bg-[rgba(0,122,255,0.1)]"
          )}
        >
          <p className={cn("text-[10px] font-semibold uppercase tracking-[0.35px] text-muted-foreground", isSelected && "text-[#007AFF]")}>{dayAbbrev}</p>
          <p className={cn("font-display text-[22px] font-bold leading-none tracking-[-0.03em] text-foreground", isSelected && "text-[#007AFF]")}>
            {dayNumber}
          </p>
        </div>

        <div className="min-w-0">
          {!session || isRest ? (
            <div className="flex min-h-[56px] items-center justify-center rounded-[14px] border border-dashed border-[rgba(60,60,67,0.22)] text-[13px] font-medium text-muted-foreground">
              {emptyLabel ?? "Repos"}
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpen}
              className="w-full min-w-0 overflow-hidden rounded-[14px] border border-black/5 bg-card text-left shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
            >
              <div className="flex items-center justify-between border-b border-[rgba(60,60,67,0.12)] px-3.5 py-2.5">
                <div className="flex min-w-0 items-center gap-1.5 text-[14px] font-semibold text-foreground">
                  {session.sportHint ? (
                    <span style={{ color: rowAccent }}>
                      <CoachSportIcon sport={session.sportHint} />
                    </span>
                  ) : null}
                  <span className="truncate">Détail</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              </div>
              <div className="px-3.5 pb-3.5 pt-3">
                {session.miniProfile?.length ? (
                  <div className="mb-2.5 h-12 rounded-[6px] bg-[rgba(120,120,128,0.08)] px-1.5 py-1">
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
                <p className="truncate text-[15px] font-semibold tracking-[-0.2px] text-foreground">{session.title}</p>
                <div className="mt-1.5 flex items-center gap-3.5 text-[12px] text-muted-foreground">
                  {session.duration ? (
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3 w-3" aria-hidden />
                      <b className="font-semibold text-[color:rgba(60,60,67,0.85)]">{session.duration}</b>
                    </span>
                  ) : null}
                  {session.distance ? (
                    <span className="inline-flex items-center gap-1">
                      <Ruler className="h-3 w-3" aria-hidden />
                      <b className="font-semibold text-[color:rgba(60,60,67,0.85)]">{session.distance}</b>
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

        <div className="flex items-center justify-end">
          {hideActionSlot ? null : !session ? (
            <button
              type="button"
              onClick={onAdd}
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#007AFF] text-white shadow-[0_2px_6px_rgba(0,122,255,0.25)] transition-transform",
                !allowSessionActions && "pointer-events-none opacity-45"
              )}
              aria-label="Ajouter une séance"
            >
              <Plus className="h-4 w-4" aria-hidden />
            </button>
          ) : isRest ? (
            <button
              type="button"
              onClick={onAdd}
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#007AFF] text-white shadow-[0_2px_6px_rgba(0,122,255,0.25)] transition-transform",
                !allowSessionActions && "pointer-events-none opacity-45"
              )}
              aria-label="Ajouter une séance"
            >
              <Plus className="h-4 w-4" aria-hidden />
            </button>
          ) : isSent ? (
            <div className={!allowSessionActions ? "pointer-events-none opacity-45" : undefined}>
              <SessionStatusAction mode="sent" onSentClick={onUnsend} />
            </div>
          ) : (
            <div className={!allowSessionActions ? "pointer-events-none opacity-45" : undefined}>
              <SessionActionMenu onSend={onSend || onAdd} onDuplicate={onDuplicate || onAdd} onDelete={onDelete || onAdd} />
            </div>
          </div>
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
