import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CoachingFullscreenHeader } from "./CoachingFullscreenHeader";
import { IosFixedPageHeaderShell } from "@/components/layout/IosFixedPageHeaderShell";
import { WeeklyTrackingView } from "./WeeklyTrackingView";
import { WeeklyPlanDialog } from "./WeeklyPlanDialog";
import type { WeekSession } from "./WeeklyPlanSessionEditor";

interface WeeklyTrackingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clubId: string;
}

export const WeeklyTrackingDialog = ({ isOpen, onClose, clubId }: WeeklyTrackingDialogProps) => {
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  const [showPlan, setShowPlan] = useState(false);
  const [planAthleteName, setPlanAthleteName] = useState<string | undefined>();
  const [planAthleteId, setPlanAthleteId] = useState<string | undefined>();
  const [planGroupId, setPlanGroupId] = useState<string | undefined>();
  const [planWeekDate, setPlanWeekDate] = useState<Date | undefined>();
  const [planSeedSessions, setPlanSeedSessions] = useState<WeekSession[] | undefined>();

  const handleBack = () => {
    if (selectedAthleteId) {
      setSelectedAthleteId(null);
    } else {
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedAthleteId(null);
    onClose();
  };

  const handleOpenPlanForAthlete = (
    athleteId: string,
    athleteName: string,
    groupId?: string,
    weekDate?: Date,
    seedSessions?: WeekSession[],
  ) => {
    setPlanAthleteId(athleteId);
    setPlanAthleteName(athleteName);
    setPlanGroupId(groupId);
    setPlanWeekDate(weekDate);
    setPlanSeedSessions(seedSessions);
    setShowPlan(true);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent fullScreen hideCloseButton className="flex min-h-0 flex-col gap-0 overflow-hidden p-0">
          <IosFixedPageHeaderShell
            className="min-h-0 flex-1"
            headerWrapperClassName="shrink-0"
            header={
              <CoachingFullscreenHeader
                title={selectedAthleteId ? "Fiche athlète" : "Suivi équipe"}
                onBack={handleBack}
              />
            }
            scrollClassName="bg-secondary px-0 py-4"
          >
            <WeeklyTrackingView
              clubId={clubId}
              onClose={onClose}
              selectedAthleteId={selectedAthleteId}
              onSelectAthlete={setSelectedAthleteId}
              onOpenPlanForAthlete={handleOpenPlanForAthlete}
            />
          </IosFixedPageHeaderShell>
        </DialogContent>
      </Dialog>

      <WeeklyPlanDialog
        isOpen={showPlan}
        onClose={() => {
          setShowPlan(false);
          setPlanSeedSessions(undefined);
        }}
        clubId={clubId}
        initialGroupId={planGroupId}
        initialAthleteName={planAthleteName}
        initialAthleteId={planAthleteId}
        initialWeek={planWeekDate}
        initialSeedSessions={planSeedSessions}
      />
    </>
  );
};
