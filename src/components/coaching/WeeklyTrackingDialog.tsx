import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ArrowLeft } from "lucide-react";
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

  const handleOpenPlanForAthlete = (athleteId: string, athleteName: string, groupId?: string) => {
    setPlanAthleteId(athleteId);
    setPlanAthleteName(athleteName);
    setPlanGroupId(groupId);
    setShowPlan(true);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent fullScreen hideCloseButton className="flex flex-col p-0 gap-0">
          {/* iOS header */}
          <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center shrink-0">
            <button onClick={handleBack} className="flex items-center gap-0.5 text-primary text-[17px] min-w-[70px]">
              <ArrowLeft className="h-5 w-5" />
              <span className="text-[15px]">Retour</span>
            </button>
            <span className="flex-1 text-center text-[17px] font-semibold text-foreground">
              {selectedAthleteId ? "Suivi de l'athlète" : "Suivi athlètes"}
            </span>
            <div className="min-w-[70px]" />
          </div>

          <div className="flex-1 overflow-y-auto bg-secondary py-4">
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
      />
    </>
  );
};
