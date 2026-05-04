import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Group } from "@/components/apple/Group";
import { WeekSelectorPremium, type DaySessionSummary } from "@/components/coaching/planning/WeekSelectorPremium";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { addDays } from "date-fns";

export type LandingAthleteCard = {
  id: string;
  name: string;
  initials: string;
  subtitle: string;
  avatarClass: string;
  statusDotClass: string;
};

export type CoachUpcomingSessionRow = {
  id: string;
  dayShort: string;
  dateNum: string;
  time: string;
  title: string;
  athleteName: string;
  athleteInitials: string;
  athleteAvatarClass: string;
  status: "sent" | "draft";
};

const STATUS_META: Record<CoachUpcomingSessionRow["status"], { label: string; dot: string }> = {
  sent: { label: "Envoyée", dot: "bg-[#34C759]" },
  draft: { label: "Brouillon", dot: "bg-[#FF9F0A]" },
};

function CoachSessionRow({
  row,
  onClick,
  last,
}: {
  row: CoachUpcomingSessionRow;
  onClick?: () => void;
  last?: boolean;
}) {
  const st = STATUS_META[row.status];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-[11px] text-left active:bg-muted/50",
        !last && "border-b border-border/80"
      )}
    >
      <div className="w-11 shrink-0 text-center">
        <p className="text-[11px] text-muted-foreground">{row.dayShort}</p>
        <p className="font-[system-ui] text-[22px] font-semibold leading-none text-foreground">{row.dateNum}</p>
      </div>
      <div className="h-9 w-px shrink-0 bg-border" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-[16px] font-semibold tracking-[-0.04em] text-foreground">{row.title}</p>
        <div className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <span
            className={cn(
              "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-white",
              row.athleteAvatarClass
            )}
          >
            {row.athleteInitials}
          </span>
          <span className="truncate">
            {row.athleteName} · {row.time}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: row.status === "sent" ? "#34C759" : "#FF9F0A" }}>
          <span className={cn("h-1.5 w-1.5 rounded-full", st.dot)} />
          {st.label}
        </span>
        <span className="text-muted-foreground/50" aria-hidden>
          ›
        </span>
      </div>
    </button>
  );
}

export function CoachPlanificationLanding({
  weekStart,
  selectedDate,
  onSelectDate,
  onPreviousWeek,
  onNextWeek,
  indicatorsByDate,
  sessionsScheduled,
  athletesActive,
  validatedCount,
  pendingCount,
  monthLine,
  athletes,
  onSelectAthlete,
  onSeeAllAthletes,
  upcomingSessions,
  onOpenSession,
  onCreateSession,
}: {
  weekStart: Date;
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  indicatorsByDate: Record<string, Array<{ color: string }>>;
  sessionsScheduled: number;
  athletesActive: number;
  validatedCount: number;
  pendingCount: number;
  monthLine: string;
  athletes: LandingAthleteCard[];
  onSelectAthlete: (id: string) => void;
  onSeeAllAthletes?: () => void;
  upcomingSessions: CoachUpcomingSessionRow[];
  onOpenSession: (id: string) => void;
  onCreateSession: () => void;
}) {
  const weekEndLabel = format(addDays(weekStart, 6), "d MMM yyyy", { locale: fr });
  const sessionSummaryByDate = {} as Record<string, DaySessionSummary>;

  return (
    <div className="apple-grouped-bg pb-36">
      <div className="px-4">
        <div className="rounded-[18px] border border-border/80 bg-card p-[18px] text-card-foreground shadow-none">
          <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{monthLine}</p>
          <div className="mt-1.5 flex items-baseline gap-3.5">
            <p className="font-[system-ui] text-[32px] font-bold leading-none tracking-[-0.06em] text-foreground">{sessionsScheduled}</p>
            <p className="text-[14px] text-muted-foreground">séances programmées</p>
          </div>
          <div className="mt-3.5 flex flex-wrap gap-x-3.5 gap-y-1 text-[13px]">
            <p>
              <span className="text-muted-foreground">Athlètes actifs</span>{" "}
              <span className="font-semibold text-foreground">· {athletesActive}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Validées</span>{" "}
              <span className="font-semibold text-[#34C759]">· {validatedCount}</span>
            </p>
            <p>
              <span className="text-muted-foreground">En attente</span>{" "}
              <span className="font-semibold text-[#FF9F0A]">· {pendingCount}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 px-4">
        <div className="mb-2.5 flex items-baseline justify-between">
          <p className="text-[13px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Calendrier</p>
          <button type="button" className="handoff-ios-link">
            Mois
          </button>
        </div>
        <div className="overflow-hidden rounded-[14px] bg-card">
          <WeekSelectorPremium
            variant="embed"
            weekStart={weekStart}
            selectedDate={selectedDate}
            onSelectDate={onSelectDate}
            onPreviousWeek={onPreviousWeek}
            onNextWeek={onNextWeek}
            indicatorsByDate={indicatorsByDate}
            sessionSummaryByDate={sessionSummaryByDate}
          />
        </div>
      </div>

      <div className="mt-3.5">
        <div className="flex items-baseline justify-between px-4 pb-2.5">
          <p className="text-[13px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
            Mes athlètes · {athletesActive}
          </p>
          {onSeeAllAthletes ? (
            <button type="button" className="handoff-ios-link" onClick={onSeeAllAthletes}>
              Voir tout
            </button>
          ) : null}
        </div>
        <div className="no-scrollbar flex gap-2.5 overflow-x-auto px-4 pb-1">
          {athletes.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onSelectAthlete(a.id)}
              className="w-24 shrink-0 rounded-[14px] border border-border/60 bg-card p-3 text-center shadow-none active:opacity-90"
            >
              <div className="relative mx-auto">
                <div
                  className={cn(
                    "mx-auto flex h-14 w-14 items-center justify-center rounded-full text-[18px] font-semibold text-white",
                    a.avatarClass
                  )}
                >
                  {a.initials}
                </div>
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card",
                    a.statusDotClass
                  )}
                  aria-hidden
                />
              </div>
              <p className="mt-2 truncate text-[13px] font-semibold tracking-[-0.03em] text-foreground">{a.name}</p>
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-tight text-muted-foreground">{a.subtitle}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 px-1">
        <Group title="Séances à venir" className="mb-0">
          {upcomingSessions.length === 0 ? (
            <div className="px-4 py-6 text-center text-[14px] text-muted-foreground">Aucune séance cette semaine.</div>
          ) : (
            upcomingSessions.map((row, i) => (
              <CoachSessionRow
                key={row.id}
                row={row}
                last={i === upcomingSessions.length - 1}
                onClick={() => onOpenSession(row.id)}
              />
            ))
          )}
        </Group>
      </div>

      <div className="pointer-events-none fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-0 right-0 z-40 px-4">
        <button type="button" onClick={onCreateSession} className="pointer-events-auto handoff-coaching-fab">
          <Plus className="h-3.5 w-3.5 stroke-[2.4px]" stroke="currentColor" aria-hidden />
          Créer une séance
        </button>
      </div>

      <p className="sr-only">Semaine jusqu’au {weekEndLabel}</p>
    </div>
  );
}
