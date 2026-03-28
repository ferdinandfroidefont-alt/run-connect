import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CoachingFullscreenHeader } from "./CoachingFullscreenHeader";
import { IosFixedPageHeaderShell } from "@/components/layout/IosFixedPageHeaderShell";
import { ClubGroupsManager } from "./ClubGroupsManager";

interface ClubGroupsManagerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clubId: string;
}

export const ClubGroupsManagerDialog = ({ isOpen, onClose, clubId }: ClubGroupsManagerDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent fullScreen hideCloseButton className="flex min-h-0 flex-col gap-0 overflow-hidden p-0">
        <IosFixedPageHeaderShell
          className="min-h-0 flex-1"
          headerWrapperClassName="shrink-0"
          header={<CoachingFullscreenHeader title="Groupes" onBack={onClose} />}
          scrollClassName="bg-secondary py-4"
        >
          <ClubGroupsManager clubId={clubId} />
        </IosFixedPageHeaderShell>
      </DialogContent>
    </Dialog>
  );
};
