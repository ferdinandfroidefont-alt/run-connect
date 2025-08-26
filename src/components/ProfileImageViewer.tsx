import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface ProfileImageViewerProps {
  isOpen: boolean;
  onClose: () => void;
  avatarUrl?: string | null;
  username?: string;
}

export const ProfileImageViewer = ({ isOpen, onClose, avatarUrl, username }: ProfileImageViewerProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 bg-transparent border-none shadow-none">
        <div className="relative">
          <Avatar className="w-96 h-96 mx-auto">
            <AvatarImage src={avatarUrl || undefined} className="object-cover" />
            <AvatarFallback className="text-6xl">
              {username?.charAt(0)?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
        </div>
      </DialogContent>
    </Dialog>
  );
};