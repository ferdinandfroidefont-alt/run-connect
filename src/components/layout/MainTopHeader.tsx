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
  right?: ReactNode;
  className?: string;
};

export function MainTopHeader({
  title,
  subtitle,
  tabs,
  tabsAriaLabel,
  right,
  className,
}: MainTopHeaderProps) {
  return (
    <div className={cn("shrink-0 pt-[var(--safe-area-top)]", className)}>
      <div className="relative flex min-h-[3.25rem] shrink-0 items-center justify-between gap-2 px-4 pb-2 pt-2">
        <div className="min-w-0 flex-1">
          <h1 className="select-none text-[2rem] font-bold leading-none tracking-[-0.02em] text-[#111111] dark:text-foreground">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 line-clamp-1 max-w-[220px] text-[12px] font-normal leading-snug text-muted-foreground">
              {subtitle}
            </p>
          ) : null}
        </div>
        {right ? <div className="flex items-center gap-2">{right}</div> : null}
      </div>

      {tabs && tabs.length > 0 ? (
        <div
          role="tablist"
          aria-label={tabsAriaLabel ?? `Navigation ${title}`}
          className="flex min-h-0 shrink-0 flex-nowrap items-end gap-6 overflow-x-auto overscroll-x-contain border-b border-[#ECECEE] px-4 pb-1.5 pt-0.5 [-ms-overflow-style:none] [scrollbar-width:none] dark:border-[#1f1f1f] sm:gap-8 [&::-webkit-scrollbar]:hidden"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={tab.active}
              className={cn(
                "shrink-0 touch-manipulation whitespace-nowrap pb-1 pt-0.5 text-[15px] font-semibold leading-tight tracking-tight transition-colors",
                tab.active ? "text-[#007AFF] dark:text-[#0A84FF]" : "text-[#8E8E93] dark:text-[#8E8E93]"
              )}
              onClick={tab.onClick}
            >
              <span className="relative inline-block pb-2">
                {tab.label}
                {tab.active ? (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-[3px] rounded-full bg-[#007AFF] dark:bg-[#0A84FF]"
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

