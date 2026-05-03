import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type MainTopHeaderTab = {
  id: string;
  label: string;
  active: boolean;
  onClick?: () => void;
};

type MainTopHeaderProps = {
  title: string;
  subtitle?: string;
  tabs?: MainTopHeaderTab[];
  tabsAriaLabel?: string;
  /** Barre compacte 44px — côté début (ex. « Calendriers ») */
  left?: ReactNode;
  right?: ReactNode;
  className?: string;
};

export function MainTopHeader({
  title,
  subtitle,
  tabs,
  tabsAriaLabel,
  left,
  right,
  className,
}: MainTopHeaderProps) {
  // Refonte Apple NavBar large title (mockup 13/17/19) :
  // - SF Pro Display 34px / bold / -0.5px tracking (apple-navbar-large)
  // - Compact bar 44h pour leading/trailing
  // - Tabs underline → bord 0.5px hairline iOS
  return (
    <div className={cn("shrink-0 pt-[var(--safe-area-top)]", className)}>
      {/* Compact bar (trailing actions) */}
      <div
        className={cn(
          "relative flex h-11 shrink-0 items-center gap-2 px-4",
          left ? "justify-between" : "justify-end"
        )}
      >
        {left ? <div className="flex min-w-0 flex-1 items-center justify-start">{left}</div> : null}
        {right ? <div className="flex shrink-0 items-center gap-2">{right}</div> : null}
      </div>

      {/* Large title — Apple iOS Settings.app/Mail.app spec : marginTop 6 / marginBottom 6 */}
      <div className="px-4 pt-1.5 pb-1.5">
        <h1 className="font-display select-none text-[34px] font-bold leading-[1.05] tracking-[-0.5px] text-foreground">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 line-clamp-1 text-[13px] font-normal leading-snug text-muted-foreground">
            {subtitle}
          </p>
        ) : null}
      </div>

      {tabs && tabs.length > 0 ? (
        <div
          role="tablist"
          aria-label={tabsAriaLabel ?? `Navigation ${title}`}
          className="flex min-h-0 shrink-0 flex-nowrap items-end gap-6 overflow-x-auto overscroll-x-contain border-b-[0.5px] border-[rgba(60,60,67,0.18)] dark:border-[rgba(84,84,88,0.65)] px-4 pb-1.5 pt-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-8 [&::-webkit-scrollbar]:hidden"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={tab.active}
              className={cn(
                "shrink-0 touch-manipulation whitespace-nowrap pb-1 pt-0.5 text-[15px] font-semibold leading-tight tracking-[-0.2px] transition-colors",
                tab.active ? "text-primary" : "text-muted-foreground"
              )}
              onClick={tab.onClick}
            >
              <span className="relative inline-block pb-2">
                {tab.label}
                {tab.active ? (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-[3px] rounded-full bg-primary"
                    aria-hidden
                  />
                ) : null}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

