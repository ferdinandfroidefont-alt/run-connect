import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type IosPageIntroProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function IosPageIntro({
  eyebrow,
  title,
  subtitle,
  badge,
  actions,
  children,
  className,
}: IosPageIntroProps) {
  return (
    <section className={cn("ios-page-intro", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {eyebrow}
            </p>
          ) : null}
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="min-w-0 truncate text-ios-title1 font-bold text-foreground">{title}</h1>
            {badge ? <div className="shrink-0">{badge}</div> : null}
          </div>
          {subtitle ? (
            <p className="mt-2 max-w-xl text-ios-subheadline leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}
