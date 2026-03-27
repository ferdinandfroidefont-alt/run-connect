import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CoachingFullscreenHeader } from "./CoachingFullscreenHeader";
import { WeeklyTrackingView } from "./WeeklyTrackingView";
import { WeeklyPlanDialog } from "./WeeklyPlanDialog";

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

  const handleOpenPlanForAthlete = (athleteId: string, athleteName: string, groupId?: string, weekDate?: Date) => {
    setPlanAthleteId(athleteId);
    setPlanAthleteName(athleteName);
    setPlanGroupId(groupId);
    setPlanWeekDate(weekDate);
    setShowPlan(true);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent fullScreen hideCloseButton className="flex flex-col p-0 gap-0">
          <CoachingFullscreenHeader
            title={selectedAthleteId ? "Fiche athlète" : "Suivi équipe"}
            onBack={handleBack}
          />

          <div className="flex-1 overflow-y-auto bg-secondary px-0 py-4 [-webkit-overflow-scrolling:touch]">
            <WeeklyTrackingView
              clubId={clubId}
              onClose={onClose}
              selectedAthleteId={selectedAthleteId}
              onSelectAthlete={setSelectedAthleteId}
              onOpenPlanForAthlete={handleOpenPlanForAthlete}
            />
          </div>
        </DialogContent>
      </Dialog>

      <WeeklyPlanDialog
        isOpen={showPlan}
        onClose={() => setShowPlan(false)}
        clubId={clubId}
        initialGroupId={planGroupId}
        initialAthleteName={planAthleteName}
        initialAthleteId={planAthleteId}
        initialWeek={planWeekDate}
      />
    </>
  );
};
