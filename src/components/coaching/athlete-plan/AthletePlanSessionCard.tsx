import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AthletePlanSessionModel } from "./types";
import { mapParticipationToUiStatus } from "./planUtils";
import { sessionStructureHint, sessionVolumeLabel } from "./planUtils";
import { sportBadgeClass, sportLabel } from "./sportTokens";
import { AthleteSessionStatusBadge } from "./AthleteSessionStatusBadge";
import { AthleteSessionActions } from "./AthleteSessionActions";

type Props = {
  session: AthletePlanSessionModel;
  onOpen: () => void;
  onConfirm?: () => void;
  onComplete?: () => void;
  onMessageCoach?: () => void;
  onComment?: () => void;
  busy?: boolean;
};

export function AthletePlanSessionCard({
  session,
  onOpen,
  onConfirm,
  onComplete,
  onMessageCoach,
  onComment,
  busy,
}: Props) {
  const ui = mapParticipationToUiStatus(session.participationStatus, session.hasConflict);
  const timeLabel = format(parseISO(session.assignedDate), "HH:mm");
  const dayLabel = format(parseISO(session.assignedDate), "EEEE d MMM", { locale: fr });
  const structure = sessionStructureHint(session);
  const volume = sessionVolumeLabel(session);
  const actionUi = ui === "conflict" ? mapParticipationToUiStatus(session.participationStatus, false) : ui;
  const primary =
    actionUi === "done" || actionUi === "missed"
      ? "none"
      : actionUi === "planned"
        ? "confirm"
        : "complete";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow",
        session.hasConflict ? "border-violet-400/50" : "border-border/80",
        busy && "ring-1 ring-amber-400/35"
      )}
    >
      <button type="button" onClick={onOpen} className="flex w-full items-start gap-3 p-3.5 text-left active:bg-secondary/50">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", sportBadgeClass(session.sport))}>
              {sportLabel(session.sport)}
            </span>
            <AthleteSessionStatusBadge status={ui} />
          </div>
          <p className="text-[11px] font-medium capitalize text-muted-foreground">{dayLabel}</p>
          <p className="text-[16px] font-semibold leading-snug text-foreground">{session.title}</p>
          <p className="text-[13px] text-muted-foreground">
            {sportLabel(session.sport)} <span className="text-muted-foreground/80">•</span> {session.coachName}
            {session.clubName ? (
              <>
                {" "}
                <span className="text-muted-foreground/80">•</span> {session.clubName}
              </>
            ) : null}
          </p>
          <p className="text-[13px] font-medium text-foreground">
            {timeLabel}
            {structure ? <span className="text-muted-foreground"> · {structure}</span> : null}
            {volume ? <span className="text-muted-foreground"> · {volume}</span> : null}
          </p>
        </div>
        <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
      </button>
      <div className="border-t border-border/60 px-3 py-2.5">
        <AthleteSessionActions
          primary={primary}
          onConfirm={actionUi === "planned" ? onConfirm : undefined}
          onComplete={onComplete}
          showCompleteWhenPlanned={actionUi === "planned"}
          onMessageCoach={onMessageCoach}
          onComment={onComment}
        />
      </div>
    </div>
  );
}
