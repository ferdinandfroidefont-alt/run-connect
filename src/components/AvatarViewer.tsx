import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AvatarViewerProps {
  open: boolean;
  onClose: () => void;
  avatarUrl: string | null;
  username: string;
}

export const AvatarViewer = ({ open, onClose, avatarUrl, username }: AvatarViewerProps) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-0 border-0 bg-transparent shadow-none" aria-describedby="avatar-description">
        <DialogTitle className="sr-only">Photo de profil de {username}</DialogTitle>
        <DialogDescription id="avatar-description" className="sr-only">
          Agrandissement de la photo de profil de {username}
        </DialogDescription>
        <div className="flex items-center justify-center">
          <Avatar className="h-80 w-80">
            <AvatarImage src={avatarUrl || ""} className="object-cover" />
            <AvatarFallback className="text-6xl bg-muted">
              {username?.charAt(0)?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
        </div>
      </DialogContent>
    </Dialog>
  );
};