import { useCallback, useEffect, useState, type SyntheticEvent } from "react";
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

/** Côté max en px (24rem) — le cercle n’excède pas la taille native pour éviter l’agrandissement flou */
const LAYOUT_MAX_PX = 384;

function layoutCapPx(): number {
  if (typeof window === "undefined") return LAYOUT_MAX_PX;
  return Math.min(LAYOUT_MAX_PX, window.innerWidth * 0.88, window.innerHeight * 0.88);
}

export const AvatarViewer = ({
  open,
  onClose,
  avatarUrl,
  username,
  stackNested = false,
}: AvatarViewerProps) => {
  const src = getProfileAvatarDisplayUrl(avatarUrl);
  const [displaySidePx, setDisplaySidePx] = useState<number | null>(null);

  useEffect(() => {
    if (!open) setDisplaySidePx(null);
  }, [open, src]);

  const onAvatarLoad = useCallback((e: SyntheticEvent<HTMLImageElement>) => {
    const el = e.currentTarget;
    const intrinsic = Math.min(el.naturalWidth, el.naturalHeight) || 1;
    setDisplaySidePx(Math.min(layoutCapPx(), intrinsic));
  }, []);

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
              onLoad={onAvatarLoad}
              className={cn(
                "shrink-0 rounded-full object-cover shadow-[0_8px_40px_rgba(0,0,0,0.45)] ring-1 ring-white/20",
                // Côtés en px entiers : évite le flou dû aux sous-pixels (surtout WebKit)
                !displaySidePx && "h-[min(88vmin,24rem)] w-[min(88vmin,24rem)]"
              )}
              style={
                displaySidePx
                  ? {
                      width: Math.round(displaySidePx),
                      height: Math.round(displaySidePx),
                      maxWidth: "100%",
                      maxHeight: "100%",
                    }
                  : { maxWidth: "100%", maxHeight: "100%" }
              }
            />
          ) : (
            <div
              className="flex h-[min(88vmin,24rem)] w-[min(88vmin,24rem)] max-h-full max-w-full shrink-0 items-center justify-center rounded-full bg-muted text-6xl font-semibold text-muted-foreground shadow-lg ring-1 ring-white/10"
            >
              {(username || "U").charAt(0).toUpperCase()}
            </div>
          )}
        </button>
      </DialogContent>
    </Dialog>
  );
};
