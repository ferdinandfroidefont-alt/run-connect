import { useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useReadyPlayerMe } from '@/hooks/useReadyPlayerMe';

interface ReadyPlayerMeCreatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAvatarCreated?: (url: string) => void;
}

export const ReadyPlayerMeCreator = ({ 
  open, 
  onOpenChange,
  onAvatarCreated 
}: ReadyPlayerMeCreatorProps) => {
  const { startCreation, avatarUrl } = useReadyPlayerMe();

  useEffect(() => {
    if (open) {
      const cleanup = startCreation();
      return cleanup;
    }
  }, [open, startCreation]);

  useEffect(() => {
    if (avatarUrl && onAvatarCreated) {
      onAvatarCreated(avatarUrl);
      onOpenChange(false);
    }
  }, [avatarUrl, onAvatarCreated, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>Créer mon avatar photoréaliste</DialogTitle>
          <DialogDescription>
            Prenez une selfie pour créer votre avatar 3D réaliste
          </DialogDescription>
        </DialogHeader>
        
        <div className="w-full h-[calc(95vh-120px)]">
          <iframe
            src="https://demo.readyplayer.me/avatar?frameApi"
            className="w-full h-full border-0"
            allow="camera *; microphone *"
            title="Ready Player Me Avatar Creator"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
