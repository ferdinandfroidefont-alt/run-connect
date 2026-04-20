import { Eye, X } from "lucide-react";
import { useAppPreview } from "@/contexts/AppPreviewContext";

/**
 * Bandeau fixe lorsque l’admin navigue avec une identité fictive (Outils créateur → Aperçu app).
 */
export function PreviewModeBanner() {
  const { isPreviewMode, previewIdentity, exitPreview } = useAppPreview();

  if (!isPreviewMode || !previewIdentity) return null;

  return (
    <div
      className="pointer-events-auto fixed left-0 right-0 top-0 z-[200] border-b border-amber-500/30 bg-amber-500/[0.12] px-3 py-2 shadow-sm backdrop-blur-md dark:border-amber-400/25 dark:bg-amber-500/[0.15]"
      style={{ paddingTop: "max(6px, env(safe-area-inset-top, 6px))" }}
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-lg items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/25 text-amber-800 dark:text-amber-100">
          <Eye className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-amber-950 dark:text-amber-50">
            Mode aperçu
          </p>
          <p className="truncate text-[13px] text-amber-950/80 dark:text-amber-100/85">
            @{previewIdentity.username} · données fictives · aucune écriture prod
          </p>
        </div>
        <button
          type="button"
          onClick={() => exitPreview()}
          className="flex shrink-0 items-center gap-1 rounded-full bg-foreground/10 px-3 py-1.5 text-[13px] font-semibold text-foreground transition-opacity active:opacity-70"
        >
          <X className="h-4 w-4" />
          Quitter
        </button>
      </div>
    </div>
  );
}
