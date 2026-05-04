import { DayEmptyStateInline } from "@/components/coaching/planning/DayEmptyStateInline";
import { DaySessionSummary, type SessionSummaryView } from "@/components/coaching/planning/DaySessionSummary";
import { SessionActionMenu } from "@/components/coaching/planning/SessionActionMenu";
import { SessionStatusAction } from "@/components/coaching/planning/SessionStatusAction";
import { MiniWorkoutProfile } from "@/components/coaching/MiniWorkoutProfile";
import { cn } from "@/lib/utils";
import { Bike, ChevronRight, Dumbbell, Footprints, Moon, Waves } from "lucide-react";

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
}

function sportAbbrev(s?: SessionSummaryView["sportHint"]) {
  switch (s) {
    case "running":
      return "Course";
    case "cycling":
      return "Vélo";
    case "swimming":
      return "Natation";
    case "strength":
      return "Renfo";
    default:
      return "Séance";
  }
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
}: DayPlanningRowProps) {
  const coachWeek = layoutVariant === "coachWeek";
  const dayAbbrev = dayLabel.slice(0, 3).toUpperCase();

  if (coachWeek) {
    const isRest = session?.isRestDay;
    const rowAccent = accentColor;

    return (
      <div
        className={cn(
          "px-4 py-3 transition-colors",
          !isLast && "border-b border-border",
          isSelected && "bg-secondary/40"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="w-12 shrink-0 text-left">
            <p className="text-[11px] tracking-[0.3px] text-muted-foreground">{dayAbbrev}</p>
            <p
              className={cn(
                "font-display text-[22px] font-semibold leading-[1.05] tracking-[-0.02em]",
                isSelected ? "text-[#0066cc]" : "text-foreground"
              )}
            >
              {dateLabel}
            </p>
          </div>

          <div className="min-w-0 flex-1">
            {!session ? (
              <p className="text-[15px] text-foreground/55">{emptyLabel ?? "Ajouter une séance"}</p>
            ) : isRest ? (
              <>
                <p className="text-[16px] font-semibold tracking-[-0.03em] text-foreground/45">Repos</p>
                <p className="text-[12px] text-muted-foreground">Aucune séance prévue</p>
              </>
            ) : (
              <button type="button" onClick={onOpen} className="w-full min-w-0 text-left">
                <div className="flex min-w-0 items-center gap-1.5">
                  {session.sportHint ? (
                    <span className="text-muted-foreground" style={{ color: rowAccent }}>
                      <CoachSportIcon sport={session.sportHint} />
                    </span>
                  ) : null}
                  <span className="truncate text-[16px] font-semibold tracking-[-0.03em] text-foreground">{session.title}</span>
                </div>
                <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                  {sportAbbrev(session.sportHint)}
                  {(session.distance || session.duration) && ` · `}
                  {[session.distance, session.duration].filter(Boolean).join(" · ")}
                </p>
              </button>
            )}
          </div>

          <div className="flex w-11 shrink-0 items-center justify-end">
            {hideActionSlot ? null : !session ? (
              <div className={!allowSessionActions ? "pointer-events-none opacity-45" : undefined}>
                <SessionStatusAction mode="add" onAdd={onAdd} />
              </div>
            ) : isRest ? (
              <ChevronRight className="h-4 w-4 text-muted-foreground/50" aria-hidden />
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

        {session && !isRest && session.miniProfile?.length ? (
          <div className="ml-[60px] mt-2.5 flex h-[38px] items-end gap-0.5 rounded-lg bg-[rgba(120,120,128,0.08)] px-2 py-1">
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
