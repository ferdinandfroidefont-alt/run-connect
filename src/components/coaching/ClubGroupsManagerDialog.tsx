import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CoachingFullscreenHeader } from "./CoachingFullscreenHeader";
import { ClubGroupsManager } from "./ClubGroupsManager";

interface ClubGroupsManagerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clubId: string;
}

export const ClubGroupsManagerDialog = ({ isOpen, onClose, clubId }: ClubGroupsManagerDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent fullScreen hideCloseButton className="flex flex-col p-0 gap-0">
        <CoachingFullscreenHeader title="Groupes" onBack={onClose} />

        <div className="flex-1 overflow-y-auto bg-secondary py-4 [-webkit-overflow-scrolling:touch]">
          <ClubGroupsManager clubId={clubId} />
        </div>
      </DialogContent>
    </Dialog>
  );
};
