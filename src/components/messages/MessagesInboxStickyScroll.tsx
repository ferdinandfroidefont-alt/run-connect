import { useEffect, useRef, useState, type ReactNode } from "react";
import { Plus } from "lucide-react";

const ACTION_BLUE = "#007AFF";

/**
 * Liste Messages : scroll unique + titre sticky façon maquette RunConnect (3).jsx — blur au scroll.
 */
export function MessagesInboxStickyScroll({
  onOpenCompose,
  children,
}: {
  onOpenCompose: () => void;
  children: ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [headerScrolled, setHeaderScrolled] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setHeaderScrolled(el.scrollTop > 4);
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      ref={scrollRef}
      className="ios-scroll-region min-h-0 flex-1 overflow-y-auto overscroll-y-contain"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <div
        className="sticky top-0 z-50 transition-all duration-200 ease-out"
        style={{
          background: headerScrolled ? "rgba(242, 242, 247, 0.72)" : "hsl(var(--muted))",
          backdropFilter: headerScrolled ? "blur(20px) saturate(180%)" : "none",
          WebkitBackdropFilter: headerScrolled ? "blur(20px) saturate(180%)" : "none",
          borderBottom: headerScrolled ? "0.5px solid rgba(0, 0, 0, 0.08)" : "0.5px solid transparent",
        }}
      >
        <div className="px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="flex items-center justify-between gap-3">
            <h1
              className="min-w-0 truncate font-display leading-none tracking-[-0.04em] text-[#0A0F1F]"
              style={{ fontSize: "44px", fontWeight: 900 }}
            >
              Messages
            </h1>
            <button
              type="button"
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center"
              aria-label="Nouvelle conversation, club ou groupe"
              onClick={onOpenCompose}
            >
              <Plus className="h-7 w-7" color={ACTION_BLUE} strokeWidth={2.4} />
            </button>
          </div>
        </div>
      </div>

      <div className="px-5 pb-8 pt-3">{children}</div>
    </div>
  );
}
