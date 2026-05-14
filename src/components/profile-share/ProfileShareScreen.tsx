import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ChevronLeft } from 'lucide-react';
import { ProfileSharePanel } from './ProfileSharePanel';

type Props = {
  open: boolean;
  onClose: () => void;
  onOpenQr?: () => void;
};

export function ProfileShareScreen({ open, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        fullScreen
        hideCloseButton
        className="flex max-h-[100dvh] flex-col gap-0 overflow-hidden border-0 bg-background p-0 sm:max-w-none"
        stackNested
      >
        <header className="relative flex shrink-0 items-center justify-center border-b border-border/60 bg-white px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={onClose}
            className="absolute left-3 top-1/2 mt-0.5 -translate-y-1/2 flex items-center gap-0.5 text-[16px] font-medium text-primary transition-opacity active:opacity-70"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.4} />
            <span>Retour</span>
          </button>
          <h2 className="text-[17px] font-semibold text-foreground">Partager mon profil</h2>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <ProfileSharePanel active={open} compact={false} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
