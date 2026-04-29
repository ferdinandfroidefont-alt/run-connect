import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type IosPageHeaderBarProps = {
  left?: ReactNode;
  title: ReactNode;
  right?: ReactNode;
  className?: string;
  titleClassName?: string;
  /** Sous-titre centré sous le titre (ex. baseline marque des maquettes). */
  subtitle?: ReactNode;
  subtitleClassName?: string;
  sideClassName?: string;
};

/**
 * Header iOS en 3 zones : gauche / titre / droite.
 * Le titre utilise flex-1 (espace entre les côtés) — évite la colonne figée à ~33 % (grille)
 * qui tronquait des titres courts comme « Paramètres » alors qu’il restait de la place.
 */
export function IosPageHeaderBar({
  left,
  title,
  right,
  className,
  titleClassName,
  subtitle,
  subtitleClassName,
  sideClassName,
}: IosPageHeaderBarProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-x-2 gap-y-1 px-4 py-2.5 ios-shell:px-2.5",
        className
      )}
    >
      <div className={cn("flex min-w-0 shrink-0 items-center justify-start", sideClassName)}>
        {left ?? <span className="inline-flex h-9 w-9 shrink-0" aria-hidden />}
      </div>
      <div className="flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center px-0.5">
        <h1
          className={cn(
            "min-w-0 w-full max-w-full text-center text-[17px] font-semibold leading-snug text-foreground",
            !subtitle && "truncate",
            titleClassName
          )}
        >
          {title}
        </h1>
        {subtitle ? (
          <div
            className={cn(
              "mt-0.5 max-w-[min(280px,85vw)] text-center text-[11px] font-medium leading-snug text-primary/80",
              subtitleClassName
            )}
          >
            {subtitle}
          </div>
        ) : null}
      </div>
      <div className={cn("flex min-w-0 shrink-0 items-center justify-end", sideClassName)}>
        {right ?? <span className="inline-flex h-9 w-9 shrink-0" aria-hidden />}
      </div>
    </div>
  );
}
