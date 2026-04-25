import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
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

const AVATAR_SIZE = "min(88vmin, 24rem)";

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
        fullScreen
        stackNested={stackNested}
        hideCloseButton
        noZoom
        onPointerDownOutside={() => onClose()}
        onEscapeKeyDown={() => onClose()}
        className="!border-0 !bg-transparent !shadow-none"
        aria-describedby="avatar-viewer-desc"
      >
        <DialogTitle className="sr-only">Photo de profil</DialogTitle>
        <DialogDescription id="avatar-viewer-desc" className="sr-only">
          {username ? `Photo de profil de ${username}` : "Agrandissement de la photo de profil"}
        </DialogDescription>

        <button
          type="button"
          className="flex h-full w-full items-center justify-center p-4 outline-none"
          onClick={() => onClose()}
          aria-label="Fermer"
        >
          {src ? (
            <img
              src={src}
              alt=""
              loading="eager"
              decoding="async"
              fetchPriority="high"
              draggable={false}
              className={cn(
                "shrink-0 rounded-full object-cover shadow-[0_8px_40px_rgba(0,0,0,0.45)] ring-1 ring-white/10",
                "transform-gpu [backface-visibility:hidden] [-webkit-backface-visibility:hidden]"
              )}
              style={{
                width: AVATAR_SIZE,
                height: AVATAR_SIZE,
                maxWidth: "100%",
                maxHeight: "100%",
              }}
            />
          ) : (
            <div
              className="flex shrink-0 items-center justify-center rounded-full bg-muted text-6xl font-semibold text-muted-foreground shadow-lg ring-1 ring-white/10"
              style={{
                width: AVATAR_SIZE,
                height: AVATAR_SIZE,
                maxWidth: "100%",
                maxHeight: "100%",
              }}
            >
              {(username || "U").charAt(0).toUpperCase()}
            </div>
          )}
        </button>
      </DialogContent>
    </Dialog>
  );
};
