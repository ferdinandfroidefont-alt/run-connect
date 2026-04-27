import { useMemo, useState } from "react";
import { addDays, eachDayOfInterval, format, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import { IosFixedPageHeaderShell } from "@/components/layout/IosFixedPageHeaderShell";
import { PlanningHeader } from "@/components/coaching/planning/PlanningHeader";
import { DayPlanningRow } from "@/components/coaching/planning/DayPlanningRow";
import { AthleteMyPlanView } from "@/components/coaching/athlete-plan/AthleteMyPlanView";
import type { AthleteCoachBrief, AthletePlanSessionModel } from "@/components/coaching/athlete-plan/types";
import type { PreviewIdentity } from "@/lib/previewIdentity";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Props = {
  identity: PreviewIdentity;
};

/**
 * Coaching en mode aperçu admin : données entièrement fictives, aucun appel métier requis pour le rendu.
 */
export function CoachingPreviewExperience({ identity }: Props) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const previewAction = () =>
    toast({
      title: "Mode aperçu",
      description: "Action désactivée — données de démonstration uniquement.",
    });

  const [coachAthleteSlice, setCoachAthleteSlice] = useState<"coach" | "athlete">(() => {
    if (identity.role === "athlete") return "athlete";
    if (identity.role === "coach") return "coach";
    return "coach";
  });

  const weekStart = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), []);
  const weekDays = useMemo(
    () => eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) }),
    [weekStart]
  );
  const [selectedDate, setSelectedDate] = useState(() => addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 2));

  const mockCoaches: AthleteCoachBrief[] = useMemo(
    () => [
      {
        id: "preview-coach-1",
        name: "Coach démo",
        sport: "Course à pied",
        avatarUrl: null,
        clubName: "Club RunConnect (fictif)",
      },
    ],
    []
  );

  const mockAthleteSessions: AthletePlanSessionModel[] = useMemo(() => {
    const d0 = format(addDays(weekStart, 2), "yyyy-MM-dd");
    const d1 = format(addDays(weekStart, 4), "yyyy-MM-dd");
    return [
      {
        id: "pv-ath-1",
        title: "Footing endurance",
        sport: "running",
        assignedDate: `${d0}T07:30:00`,
        blocks: [
          {
            id: "bl-1",
            order: 1,
            type: "steady",
            durationSec: 2700,
            intensityMode: "zones",
            zone: "Z2",
          },
        ],
        coachId: "preview-coach-1",
        coachName: "Coach démo",
        coachAvatarUrl: null,
        clubId: "preview-club",
        clubName: "Club RunConnect (fictif)",
        participationId: null,
        participationStatus: "planned",
        athleteNote: null,
        distanceKm: 12,
        objective: "Endurance fondamentale",
        coachNotes: "Rester en Z2 — respiration confortable.",
        locationName: null,
        description: null,
        hasConflict: false,
      },
      {
        id: "pv-ath-2",
        title: "VMA courte",
        sport: "running",
        assignedDate: `${d1}T18:00:00`,
        blocks: [
          {
            id: "bl-2",
            order: 1,
            type: "interval",
            durationSec: 600,
            repetitions: 6,
            recoveryDurationSec: 90,
            intensityMode: "zones",
            zone: "Z5",
          },
        ],
        coachId: "preview-coach-1",
        coachName: "Coach démo",
        coachAvatarUrl: null,
        clubId: "preview-club",
        clubName: "Club RunConnect (fictif)",
        participationId: null,
        participationStatus: "planned",
        athleteNote: null,
        distanceKm: 8,
        objective: "Vitesse",
        coachNotes: null,
        locationName: "Piste",
        description: null,
        hasConflict: false,
      },
    ];
  }, [weekStart]);

  const coachDayRows = useMemo(() => {
    const labels = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];
    return weekDays.map((d, i) => ({
      key: format(d, "yyyy-MM-dd"),
      dayLabel: labels[i] ?? format(d, "EEE", { locale: fr }),
      dateLabel: format(d, "d MMM", { locale: fr }),
      session:
        i === 1
          ? {
              title: "Séance démo — Seuil 3×8 min",
              duration: "1h05",
              distance: "12 km",
              intensityLabel: "Z4",
            }
          : i === 3
            ? {
                title: "Récupération active",
                duration: "40 min",
                distance: "6 km",
                intensityLabel: "Z1–Z2",
              }
            : undefined,
    }));
  }, [weekDays]);

  const showCoachSlice =
    identity.role === "coach" || (identity.role === "both" && coachAthleteSlice === "coach");
  const showAthleteSlice =
    identity.role === "athlete" || (identity.role === "both" && coachAthleteSlice === "athlete");

  return (
    <IosFixedPageHeaderShell
      className="min-h-0 flex-1 bg-secondary"
      headerWrapperClassName="shrink-0"
      contentScroll
      scrollClassName="min-h-0 bg-secondary"
      header={
        <PlanningHeader
          onOpenMenu={previewAction}
          title="Coaching"
          subtitle="Aperçu — données fictives"
        />
      }
    >
      <div className="space-y-4 px-4 pb-6 pt-2">
        <div className="flex items-start gap-3 rounded-[14px] border border-primary/20 bg-primary/[0.06] px-3.5 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-primary/15 text-primary">
            <GraduationCap className="h-5 w-5" />
          </div>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Vue de démonstration pour le rôle{" "}
            <span className="font-semibold text-foreground">
              {identity.role === "coach"
                ? "coach"
                : identity.role === "athlete"
                  ? "athlète"
                  : "coach + athlète"}
            </span>
            . Aucun club réel, aucune écriture.
          </p>
        </div>

        {identity.role === "both" && (
          <div className="flex rounded-[12px] border border-border/60 bg-card p-1 shadow-sm">
            <button
              type="button"
              className={cn(
                "flex-1 rounded-[10px] py-2 text-[13px] font-semibold transition-colors",
                coachAthleteSlice === "coach"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground"
              )}
              onClick={() => setCoachAthleteSlice("coach")}
            >
              Vue coach
            </button>
            <button
              type="button"
              className={cn(
                "flex-1 rounded-[10px] py-2 text-[13px] font-semibold transition-colors",
                coachAthleteSlice === "athlete"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground"
              )}
              onClick={() => setCoachAthleteSlice("athlete")}
            >
              Vue athlète
            </button>
          </div>
        )}

        {showCoachSlice && (
          <section className="overflow-hidden rounded-[14px] border border-border/50 bg-card shadow-sm">
            <div className="border-b border-border/60 bg-muted/30 px-4 py-3">
              <p className="text-[15px] font-semibold text-foreground">Planning club (fictif)</p>
              <p className="text-[12px] text-muted-foreground">
                Semaine du {format(weekStart, "d MMMM yyyy", { locale: fr })}
              </p>
            </div>
            {coachDayRows.map((row) => (
              <DayPlanningRow
                key={row.key}
                dayLabel={row.dayLabel}
                dateLabel={row.dateLabel}
                session={row.session}
                isSent={false}
                accentColor="hsl(var(--primary))"
                onAdd={previewAction}
                onOpen={previewAction}
                onEdit={previewAction}
                onSend={previewAction}
                onDuplicate={previewAction}
                onDelete={previewAction}
                onUnsend={previewAction}
                allowSessionActions
              />
            ))}
          </section>
        )}

        {showAthleteSlice && (
          <section className="overflow-hidden rounded-[14px] border border-border/50 bg-card shadow-sm">
            <AthleteMyPlanView
              loading={false}
              weekDays={weekDays}
              weekStart={weekStart}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onPreviousWeek={() => previewAction()}
              onNextWeek={() => previewAction()}
              sessions={mockAthleteSessions}
              prevWeekPlannedKm={42}
              coaches={mockCoaches}
              onConfirmSession={() => { previewAction(); }}
              onCompleteSession={() => { previewAction(); }}
              onMessageCoach={() => previewAction()}
              onPersistSessionFeedback={async () => { previewAction(); }}
              onOpenCoaches={() => previewAction()}
              onOpenMessages={() => previewAction()}
              onOpenPastSessions={() => previewAction()}
              onOpenCalendar={() => previewAction()}
              onOpenExportApps={() => previewAction()}
              navigateProfile={() => navigate("/", { state: { openProfileDialog: true } })}
            />
          </section>
        )}

        <Button
          type="button"
          variant="outline"
          className="w-full rounded-[12px]"
          onClick={() => navigate(-1)}
        >
          Retour
        </Button>
      </div>
    </IosFixedPageHeaderShell>
  );
}
