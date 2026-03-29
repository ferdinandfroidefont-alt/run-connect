import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type IosPageHeaderBarProps = {
  left?: ReactNode;
  title: ReactNode;
  right?: ReactNode;
  className?: string;
  titleClassName?: string;
  sideClassName?: string;
};

/**
 * Header iOS robuste en 3 zones.
 * Le titre reste réellement centré même si les côtés n'ont pas le même contenu.
 */
export function IosPageHeaderBar({
  left,
  title,
  right,
  className,
  titleClassName,
  sideClassName,
}: IosPageHeaderBarProps) {
  return (
    <div
      className={cn(
        "grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-4 py-2.5 ios-shell:px-2.5",
        className
      )}
    >
      <div className={cn("flex min-w-0 justify-start", sideClassName)}>
        {left ?? <div className="h-9 w-9 shrink-0" aria-hidden />}
      </div>
      <h1
        className={cn(
          "min-w-0 max-w-[min(16rem,calc(100vw-8rem))] truncate text-center text-[17px] font-semibold text-foreground",
          titleClassName
        )}
      >
        {title}
      </h1>
      <div className={cn("flex min-w-0 justify-end", sideClassName)}>
        {right ?? <div className="h-9 w-9 shrink-0" aria-hidden />}
      </div>
    </div>
  );
}
