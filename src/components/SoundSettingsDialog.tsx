import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAppContext } from "@/contexts/AppContext";

interface SoundSettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export const SoundSettingsDialog = ({ open, onClose }: SoundSettingsDialogProps) => {
  const { soundEnabled, setSoundEnabled } = useAppContext();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Paramètres audio</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="sound-feedback" className="text-sm font-medium">
              Retour sonore des boutons
            </Label>
            <Switch
              id="sound-feedback"
              checked={soundEnabled}
              onCheckedChange={setSoundEnabled}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Active un son discret lors des interactions avec les boutons
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};