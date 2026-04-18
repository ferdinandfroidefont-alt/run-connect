import { useMemo, useState, type ComponentType } from "react";
import { format, isSameDay, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarDays, ChevronRight, MessageCircle, History, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AthleteCoachBrief, AthletePlanSessionModel } from "./types";
import { applyConflictFlags, buildWeekSummary, dayConflictMessage } from "./planUtils";
import { AthletePlanSummaryCard } from "./AthletePlanSummaryCard";
import { AthleteWeekSwitcher } from "./AthleteWeekSwitcher";
import { AthleteWeekMiniCalendar } from "./AthleteWeekMiniCalendar";
import { AthletePlanSessionCard } from "./AthletePlanSessionCard";
import { AthleteCoachesCard } from "./AthleteCoachesCard";
import { AthleteConflictBanner } from "./AthleteConflictBanner";
import { AthletePlanSessionDetailSheet } from "./AthletePlanSessionDetailSheet";

type Props = {
  loading: boolean;
  weekDays: Date[];
  weekStart: Date;
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  sessions: AthletePlanSessionModel[];
  prevWeekPlannedKm: number | null;
  coaches: AthleteCoachBrief[];
  onConfirmSession: (session: AthletePlanSessionModel) => Promise<void> | void;
  onCompleteSession: (session: AthletePlanSessionModel) => Promise<void> | void;
  onMessageCoach: (coachId: string) => void;
  onPersistSessionFeedback: (
    session: AthletePlanSessionModel,
    payload: { note: string; rpe: number | null; felt: "easy" | "ok" | "hard" | null }
  ) => Promise<void> | void;
  onOpenCoaches?: () => void;
  onOpenMessages?: () => void;
  onOpenPastSessions?: () => void;
  onOpenCalendar?: () => void;
  navigateProfile: (userId: string) => void;
};

export function AthleteMyPlanView({
  loading,
  weekDays,
  weekStart,
  selectedDate,
  onSelectDate,
  onPreviousWeek,
  onNextWeek,
  sessions: rawSessions,
  prevWeekPlannedKm,
  coaches,
  onConfirmSession,
  onCompleteSession,
  onMessageCoach,
  onPersistSessionFeedback,
  onOpenCoaches,
  onOpenMessages,
  onOpenPastSessions,
  onOpenCalendar,
  navigateProfile,
}: Props) {
  const [detail, setDetail] = useState<AthletePlanSessionModel | null>(null);
  const [savingFeedback, setSavingFeedback] = useState(false);

  const sessions = useMemo(() => applyConflictFlags(rawSessions), [rawSessions]);
  const summary = useMemo(() => buildWeekSummary(sessions, prevWeekPlannedKm), [sessions, prevWeekPlannedKm]);

  const daySessions = useMemo(() => {
    return sessions.filter((s) => isSameDay(parseISO(s.assignedDate), selectedDate)).sort(
      (a, b) => new Date(a.assignedDate).getTime() - new Date(b.assignedDate).getTime()
    );
  }, [sessions, selectedDate]);

  const globalConflict = useMemo(() => {
    const msgs: string[] = [];
    weekDays.forEach((d) => {
      const m = dayConflictMessage(sessions, d);
      if (m) msgs.push(m);
    });
    return msgs.length ? msgs[0] : null;
  }, [sessions, weekDays]);

  const busyDay = daySessions.length >= 3;

  return (
    <div className="space-y-4 px-4 pb-28 pt-2">
      <AthletePlanSummaryCard summary={summary} />

      <AthleteWeekSwitcher weekStart={weekStart} onPreviousWeek={onPreviousWeek} onNextWeek={onNextWeek} />

      <AthleteWeekMiniCalendar
        weekDays={weekDays}
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
        sessions={sessions}
      />

      {globalConflict ? (
        <AthleteConflictBanner
          message={globalConflict}
          onView={() => {
            const first = sessions.find((s) => s.hasConflict);
            if (first) onSelectDate(parseISO(first.assignedDate));
          }}
          onMessageCoach={() => {
            const c = coaches[0];
            if (c) onMessageCoach(c.id);
          }}
        />
      ) : null}

      <div className="min-h-[min(320px,48vh)]">
        <div className="mb-2 flex items-center justify-between px-0.5">
          <p className="text-[13px] font-semibold text-foreground">
            {format(selectedDate, "EEEE d MMMM", { locale: fr })}
          </p>
          {busyDay ? (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:text-amber-200">
              Journée chargée
            </span>
          ) : null}
        </div>

        <div className="relative">
          {loading ? (
            <div className="space-y-3" aria-busy="true" aria-label="Chargement des séances">
              {[1, 2].map((i) => (
                <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted/50 shadow-sm" />
              ))}
            </div>
          ) : daySessions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/80 px-4 py-10 text-center">
              <p className="text-[15px] font-medium text-foreground">Aucune séance ce jour</p>
              <p className="mt-1 text-[13px] text-muted-foreground">Changez de jour ou de semaine pour voir votre planning.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {daySessions.map((s) => (
                <AthletePlanSessionCard
                  key={s.id}
                  session={s}
                  busy={busyDay}
                  onOpen={() => setDetail(s)}
                  onConfirm={() => void onConfirmSession(s)}
                  onComplete={() => void onCompleteSession(s)}
                  onMessageCoach={() => onMessageCoach(s.coachId)}
                  onComment={() => setDetail(s)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div id="athlete-coaches-block" className="scroll-mt-24">
        <AthleteCoachesCard
          coaches={coaches}
          onProfile={(id) => navigateProfile(id)}
          onMessage={(id) => onMessageCoach(id)}
        />
      </div>

      <div className="rounded-2xl border border-border/80 bg-card p-3 shadow-sm">
        <p className="mb-2 px-1 text-[12px] font-semibold text-muted-foreground">Actions rapides</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <QuickAction icon={Users} label="Voir mes coachs" onClick={onOpenCoaches} />
          <QuickAction icon={MessageCircle} label="Envoyer un message" onClick={onOpenMessages} />
          <QuickAction icon={History} label="Séances passées" onClick={onOpenPastSessions} />
          <QuickAction icon={CalendarDays} label="Calendrier complet" onClick={onOpenCalendar} />
        </div>
      </div>

      <AthletePlanSessionDetailSheet
        session={detail}
        open={detail != null}
        onOpenChange={(o) => !o && setDetail(null)}
        onConfirm={() => { if (detail) { Promise.resolve(onConfirmSession(detail)).then(() => setDetail(null)); } }}
        onComplete={() => { if (detail) { Promise.resolve(onCompleteSession(detail)).then(() => setDetail(null)); } }}
        onMessageCoach={() => detail && onMessageCoach(detail.coachId)}
        saving={savingFeedback}
        onSaveFeedback={async (payload) => {
          if (!detail) return;
          setSavingFeedback(true);
          try {
            let note = payload.note.trim();
            if (payload.felt === "easy") note = `[Ressenti: facile] ${note}`.trim();
            if (payload.felt === "ok") note = `[Ressenti: ok] ${note}`.trim();
            if (payload.felt === "hard") note = `[Ressenti: dur] ${note}`.trim();
            if (payload.rpe != null) note = `${note ? `${note}\n` : ""}RPE ${payload.rpe}/10`.trim();
            await onPersistSessionFeedback(detail, { note, rpe: payload.rpe, felt: payload.felt });
          } finally {
            setSavingFeedback(false);
          }
        }}
      />
    </div>
  );
}

function QuickAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
}) {
  return (
    <Button
      type="button"
      variant="secondary"
      className={cn("h-11 justify-between rounded-xl px-3 text-[13px] font-medium", !onClick && "opacity-50")}
      disabled={!onClick}
      onClick={onClick}
    >
      <span className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {label}
      </span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Button>
  );
}
