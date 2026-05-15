import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type IosPageHeaderBarProps = {
  left?: ReactNode;
  /** Style Réglages iOS : chevron + libellé bleu (prioritaire sur `left` si les deux sont fournis). */
  leadingBack?: { onClick: () => void; label?: string; buttonClassName?: string };
  title: ReactNode;
  right?: ReactNode;
  className?: string;
  titleClassName?: string;
  sideClassName?: string;
};

/**
 * Header iOS en 3 zones : gauche / titre / droite.
 * Le titre utilise flex-1 (espace entre les côtés) — évite la colonne figée à ~33 % (grille)
 * qui tronquait des titres courts comme « Paramètres » alors qu’il restait de la place.
 */
export function IosPageHeaderBar({
  left,
  leadingBack,
  title,
  right,
  className,
  titleClassName,
  sideClassName,
}: IosPageHeaderBarProps) {
  const leftNode = leadingBack ? (
    <button
      type="button"
      onClick={leadingBack.onClick}
      aria-label={leadingBack.label ?? "Retour"}
      className={cn(
        "flex min-w-0 items-center gap-0.5 rounded-lg py-1 pr-1 text-left text-[17px] font-semibold text-[#007AFF] active:opacity-60 [-webkit-tap-highlight-color:transparent] dark:text-[#0A84FF]",
        leadingBack.buttonClassName,
      )}
    >
      <ChevronLeft className="h-6 w-6 shrink-0 stroke-[2.6]" aria-hidden />
      <span className="min-w-0 whitespace-nowrap">{leadingBack.label ?? "Retour"}</span>
    </button>
  ) : (
    left
  );

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-x-2 gap-y-1 px-4 py-2.5 ios-shell:px-2.5",
        className
      )}
    >
      <div className={cn("flex min-w-0 shrink-0 items-center justify-start", sideClassName)}>
        {leftNode ?? <span className="inline-flex h-9 w-9 shrink-0" aria-hidden />}
      </div>
      <div className="flex min-h-[44px] min-w-0 flex-1 items-center justify-center px-0.5">
        <h1
          className={cn(
            "min-w-0 w-full max-w-full truncate text-center text-[17px] font-bold leading-snug text-[#0A0F1F] dark:text-foreground",
            titleClassName
          )}
        >
          {title}
        </h1>
      </div>
      <div className={cn("flex min-w-0 shrink-0 items-center justify-end", sideClassName)}>
        {right ?? <span className="inline-flex h-9 w-9 shrink-0" aria-hidden />}
      </div>
    </div>
  );
}
