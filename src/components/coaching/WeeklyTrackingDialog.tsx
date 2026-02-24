import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ArrowLeft } from "lucide-react";
import { WeeklyTrackingView } from "./WeeklyTrackingView";

interface WeeklyTrackingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clubId: string;
}

export const WeeklyTrackingDialog = ({ isOpen, onClose, clubId }: WeeklyTrackingDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent fullScreen hideCloseButton className="flex flex-col p-0 gap-0">
        {/* iOS header */}
        <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center shrink-0">
          <button onClick={onClose} className="flex items-center gap-0.5 text-primary text-[17px] min-w-[70px]">
            <ArrowLeft className="h-5 w-5" />
            <span className="text-[15px]">Retour</span>
          </button>
          <span className="flex-1 text-center text-[17px] font-semibold text-foreground">
            Suivi athlètes
          </span>
          <div className="min-w-[70px]" />
        </div>

        <div className="flex-1 overflow-y-auto bg-secondary p-4">
          <WeeklyTrackingView clubId={clubId} onClose={onClose} />
        </div>
      </DialogContent>
    </Dialog>
  );
};
