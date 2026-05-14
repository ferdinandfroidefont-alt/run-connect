import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft } from "lucide-react";

const ACTION_BLUE = "#007AFF";
const PAGE_BG = "#F2F2F7";

type MessagesMaquetteSubpageShellProps = {
  title: string;
  titleSizePx: number;
  onBack: () => void;
  children: ReactNode;
};

/**
 * En-tête sticky + fond #F2F2F7 (maquette Messages sous-pages : nouveau message, créer club, etc.)
 */
export function MessagesMaquetteSubpageShell({
  title,
  titleSizePx,
  onBack,
  children,
}: MessagesMaquetteSubpageShellProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 4);
    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[140] flex min-h-0 flex-col overflow-hidden"
      style={{ backgroundColor: PAGE_BG }}
      data-no-tab-swipe="true"
    >
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]"
        style={{ overscrollBehaviorY: "contain" }}
      >
        <div
          className="sticky top-0 z-50 transition-all duration-200 ease-out"
          style={{
            background: scrolled ? "rgba(242, 242, 247, 0.72)" : PAGE_BG,
            backdropFilter: scrolled ? "blur(20px) saturate(180%)" : "none",
            WebkitBackdropFilter: scrolled ? "blur(20px) saturate(180%)" : "none",
            borderBottom: scrolled ? "0.5px solid rgba(0, 0, 0, 0.08)" : "0.5px solid transparent",
            paddingTop: "max(env(safe-area-inset-top, 0px), 16px)",
          }}
        >
          <div className="px-5 pb-3 pt-1">
            <button
              type="button"
              onClick={onBack}
              className="-ml-1 mb-1.5 flex touch-manipulation items-center active:opacity-70"
              style={{ color: ACTION_BLUE }}
            >
              <ChevronLeft className="h-6 w-6" strokeWidth={2.4} />
              <span className="text-[17px] font-semibold">Retour</span>
            </button>
            <h1
              className="truncate leading-none text-[#0A0F1F]"
              style={{
                fontSize: titleSizePx,
                fontWeight: 900,
                letterSpacing: "-0.04em",
              }}
            >
              {title}
            </h1>
          </div>
        </div>
        <div className="px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-3">{children}</div>
      </div>
    </div>
  );
}
