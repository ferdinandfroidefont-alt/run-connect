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
        "grid min-w-0 grid-cols-3 items-center gap-x-2 gap-y-1 px-4 py-2.5 ios-shell:px-2.5",
        className
      )}
    >
      <div className={cn("flex min-w-0 items-center justify-self-start", sideClassName)}>
        {left ?? <span className="inline-flex h-9 w-9 shrink-0" aria-hidden />}
      </div>
      <div className="flex min-w-0 min-h-[44px] items-center justify-center justify-self-stretch px-0.5">
        <h1
          className={cn(
            "min-w-0 max-w-full truncate text-center text-[17px] font-semibold leading-snug text-foreground",
            titleClassName
          )}
        >
          {title}
        </h1>
      </div>
      <div className={cn("flex min-w-0 items-center justify-self-end", sideClassName)}>
        {right ?? <span className="inline-flex h-9 w-9 shrink-0" aria-hidden />}
      </div>
    </div>
  );
}
