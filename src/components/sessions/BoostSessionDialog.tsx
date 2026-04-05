import { Sparkles, Radar, Users, Play } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface BoostSessionDialogProps {
  open: boolean;
  onClose: () => void;
  onWatchVideo: () => void;
  loading?: boolean;
}

export function BoostSessionDialog({
  open,
  onClose,
  onWatchVideo,
  loading = false,
}: BoostSessionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogContent className="max-w-md rounded-[24px] border border-border/60 p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-primary/15 via-primary/8 to-transparent px-6 pt-6 pb-4">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <Sparkles className="h-7 w-7" />
          </div>
          <DialogHeader className="space-y-2 text-center">
            <DialogTitle className="text-[22px] text-center">Booster ta séance ?</DialogTitle>
            <DialogDescription className="text-[14px] leading-relaxed text-center">
              Plus de visibilité, plus de sportifs proches, plus de chances d'avoir du monde.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 space-y-3">
          <div className="rounded-2xl border border-border/60 bg-secondary/40 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/12 text-primary">
                <Radar className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-foreground">Visibilité élargie pendant 1h</p>
                <p className="text-[12px] text-muted-foreground">Portée locale étendue de 5 km à 25 km</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/12 text-primary">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-foreground">Mise en avant carte et feed</p>
                <p className="text-[12px] text-muted-foreground">Pin plus visible et remontée temporaire</p>
              </div>
            </div>
          </div>

          <Button
            className="h-12 w-full rounded-2xl text-[15px] font-semibold gap-2"
            onClick={onWatchVideo}
            disabled={loading}
          >
            <Play className="h-4 w-4" />
            Regarder une vidéo
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-11 w-full rounded-2xl text-[14px] font-medium"
            onClick={onClose}
            disabled={loading}
          >
            Non merci
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
