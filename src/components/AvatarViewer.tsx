import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getProfileAvatarDisplayUrl } from "@/lib/profileAvatarUrl";

interface AvatarViewerProps {
  open: boolean;
  onClose: () => void;
  avatarUrl: string | null;
  username: string;
  /** Au-dessus d’un autre dialog (ex. profil). */
  stackNested?: boolean;
}

export const AvatarViewer = ({
  open,
  onClose,
  avatarUrl,
  username,
  stackNested = false,
}: AvatarViewerProps) => {
  const src = getProfileAvatarDisplayUrl(avatarUrl);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        stackNested={stackNested}
        hideCloseButton
        noZoom
        className="flex max-h-[min(92dvh,40rem)] min-h-0 min-w-0 max-w-[min(100vw,28rem)] flex-col gap-0 overflow-hidden rounded-2xl border border-border/60 bg-card p-0 shadow-lg"
        aria-describedby="avatar-viewer-desc"
      >
        <DialogTitle className="sr-only">Photo de profil de {username}</DialogTitle>
        <DialogDescription id="avatar-viewer-desc" className="sr-only">
          Agrandissement de la photo de profil de {username}
        </DialogDescription>

        <div className="flex items-center justify-between border-b border-border/50 px-3 py-2">
          <p className="min-w-0 truncate text-[15px] font-semibold text-foreground">@{username}</p>
          <DialogClose
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary active:opacity-70"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </DialogClose>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-3">
          {src ? (
            <img
              src={src}
              alt=""
              decoding="async"
              fetchPriority="high"
              className={cn(
                "mx-auto block h-auto max-h-[min(78dvh,36rem)] w-full max-w-full rounded-xl object-contain",
                "[image-rendering:auto] [backface-visibility:hidden] [-webkit-backface-visibility:hidden]"
              )}
            />
          ) : (
            <div className="flex aspect-square max-h-80 w-full max-w-sm items-center justify-center rounded-xl bg-muted text-6xl font-semibold text-muted-foreground">
              {(username || "U").charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
