import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/** Hauteur de la rangée compacte type barre de navigation iOS (44 pt). */
export const IOS_COLLAPSIBLE_HEADER_COMPACT_ROW_PX = 44;

function smoothstep01(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

export type IosCollapsibleLargeTitleLayoutProps = {
  /** Titre dans la barre compacte (centré, ~17 pt). */
  title: string;
  /** Grand titre en tête de contenu (défaut = title). */
  largeTitle?: string;
  /** Zone gauche (ex. bouton retour) — reste alignée pendant le scroll. */
  left?: ReactNode;
  /** Zone droite (actions). */
  right?: ReactNode;
  /** Contenu scrollable sous le grand titre. */
  children: ReactNode;
  className?: string;
  /** Classe sur la zone scroll (fond, etc.). */
  scrollClassName?: string;
  /** Classe sur le wrapper du grand titre + padding horizontal. */
  largeTitleWrapperClassName?: string;
  /**
   * Distance de scroll (px) sur laquelle on interpole grand → compact.
   * Plus la valeur est grande, plus la transition est « lente ».
   */
  collapseRangePx?: number;
};

/**
 * Header façon App Store iOS : grand titre dans le flux scroll, barre compacte
 * translucide qui apparaît progressivement et reste fixe en haut.
 *
 * - Safe area gérée (notch / Dynamic Island).
 * - Thème clair / sombre via tokens `background`, `border`, `foreground`.
 * - Scroll natif : pas de double header, le contenu défile sous la barre fixe.
 */
export function IosCollapsibleLargeTitleLayout({
  title,
  largeTitle,
  left,
  right,
  children,
  className,
  scrollClassName,
  largeTitleWrapperClassName,
  collapseRangePx = 88,
}: IosCollapsibleLargeTitleLayoutProps) {
  const largeTitleId = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);
  const rafRef = useRef<number | null>(null);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      setScrollY(el.scrollTop);
    });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", onScroll, { passive: true });
    setScrollY(el.scrollTop);
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [onScroll]);

  const progress = useMemo(
    () => smoothstep01(scrollY / Math.max(16, collapseRangePx)),
    [scrollY, collapseRangePx]
  );

  const compactOpacity = progress;
  const showBarSurface = progress > 0.04;

  const displayLarge = largeTitle ?? title;

  return (
    <div
      className={cn(
        "relative flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden",
        className
      )}
    >
      {/* Barre compacte fixe — même logique que la tab bar : translucide quand active */}
      <header
        className="pointer-events-none fixed inset-x-0 top-0 z-[60]"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
        aria-hidden={false}
      >
        <div
          className={cn(
            "pointer-events-auto flex min-h-[44px] items-stretch border-b px-ios-2 ios-shell:px-2.5",
            "transition-[border-color,background-color] duration-150 ease-out",
            showBarSurface
              ? "border-border/60 bg-background/85 shadow-[0_1px_0_rgba(0,0,0,0.04)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/75 dark:bg-background/90 dark:shadow-[0_1px_0_rgba(255,255,255,0.06)]"
              : "border-transparent bg-transparent"
          )}
        >
          <div className="flex min-w-0 shrink-0 items-center justify-start">
            {left ?? <span className="inline-flex h-9 w-9 shrink-0" aria-hidden />}
          </div>
          <div className="flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center px-0.5">
            <span
              className="max-w-full truncate text-center text-[17px] font-semibold leading-snug text-foreground"
              style={{
                opacity: compactOpacity,
                transform: `scale(${0.98 + 0.02 * compactOpacity})`,
              }}
              aria-hidden
            >
              {title}
            </span>
          </div>
          <div className="flex min-w-0 shrink-0 items-center justify-end">
            {right ?? <span className="inline-flex h-9 w-9 shrink-0" aria-hidden />}
          </div>
        </div>
      </header>

      {/* Contenu : grand titre + enfants — défile sous la barre fixe */}
      <div
        ref={scrollRef}
        className={cn(
          "ios-scroll-region min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]",
          scrollClassName
        )}
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div
          className={cn("px-4 ios-shell:px-2.5", largeTitleWrapperClassName)}
          style={{
            paddingTop: `calc(env(safe-area-inset-top, 0px) + ${IOS_COLLAPSIBLE_HEADER_COMPACT_ROW_PX}px + 10px)`,
          }}
        >
          <h1
            id={largeTitleId}
            className="max-w-full pb-3 text-[34px] font-bold leading-[1.15] tracking-tight text-foreground"
            style={{
              opacity: 1 - compactOpacity * 0.85,
            }}
          >
            {displayLarge}
          </h1>
        </div>

        {children}
      </div>
    </div>
  );
}
