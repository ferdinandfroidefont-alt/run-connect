import { useEffect, useRef, useState, type ReactNode } from "react";
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
  /** Action alignée au grand titre (ex. avatar club). */
  largeTitleRight?: ReactNode;
  className?: string;
};

export function MainTopHeader({
  title,
  subtitle,
  tabs,
  tabsAriaLabel,
  left,
  right,
  largeTitleRight,
  className,
}: MainTopHeaderProps) {
  // Refonte Apple NavBar large title (mockup 13/17/19) :
  // - SF Pro Display 34px / bold / -0.5px tracking (apple-navbar-large)
  // - Compact bar 44h pour leading/trailing
  // - Tabs underline → bord 0.5px hairline iOS
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const resolveScrollElement = (): HTMLElement | null => {
      const host = root.closest(".flex.h-full, .flex.min-h-0, [data-tutorial]") || root.parentElement;
      if (!host) return null;
      return host.querySelector<HTMLElement>(".ios-scroll-region, .ios-keyboard-scroll-body");
    };

    const scrollEl = resolveScrollElement();
    if (!scrollEl) {
      setProgress(0);
      return;
    }

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const next = Math.max(0, Math.min(1, scrollEl.scrollTop / 56));
        setProgress((prev) => (Math.abs(prev - next) > 0.01 ? next : prev));
      });
    };

    onScroll();
    scrollEl.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      scrollEl.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn("shrink-0 pt-[var(--safe-area-top)]", className)}
      style={{
        backgroundColor: `hsl(var(--background) / ${0.62 * progress})`,
        backdropFilter: progress > 0.02 ? `saturate(${1 + progress * 0.35}) blur(${14 * progress}px)` : "none",
      }}
    >
      {/* Compact bar (trailing actions) */}
      <div
        className={cn(
          "relative flex h-11 shrink-0 items-center gap-2 px-4",
          left || right ? "justify-between" : "justify-end"
        )}
      >
        <div className="flex min-w-0 flex-1 items-center justify-start">{left ?? <span aria-hidden className="h-9 w-9" />}</div>
        <h2
          aria-hidden={progress < 0.95}
          className="pointer-events-none absolute left-1/2 top-1/2 w-[60%] -translate-x-1/2 -translate-y-1/2 truncate text-center text-[17px] font-semibold leading-snug text-foreground"
          style={{
            opacity: progress,
            transform: `translate(-50%, calc(-50% + ${(1 - progress) * 6}px))`,
          }}
        >
          {title}
        </h2>
        <div className="flex min-w-0 shrink-0 items-center justify-end gap-4">{right ?? <span aria-hidden className="h-9 w-9" />}</div>
      </div>

      {/* Large title — Apple iOS Settings.app/Mail.app spec : marginTop 6 / marginBottom 6 */}
      <div
        className="origin-left px-4 pt-1.5 pb-1.5"
        style={{
          opacity: 1 - progress,
          transform: `translateY(${-10 * progress}px) scale(${1 - progress * 0.18})`,
        }}
      >
        <div className="flex min-w-0 items-center justify-between gap-3">
          <h1 className="font-display min-w-0 select-none truncate text-[34px] font-bold leading-[1.05] tracking-[-0.5px] text-foreground">
            {title}
          </h1>
          {largeTitleRight ? <div className="shrink-0">{largeTitleRight}</div> : null}
        </div>
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
      <div
        aria-hidden
        className="h-[0.5px]"
        style={{
          backgroundColor: `hsl(var(--border) / ${progress})`,
        }}
      />
    </div>
  );
}

