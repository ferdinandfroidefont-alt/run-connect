import {
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
  type UIEvent,
} from "react";
import { cn } from "@/lib/utils";

export type IosAppStoreScrollLayoutProps = {
  children: ReactNode;
  /** Grand titre (défile avec le contenu). */
  titleLarge: ReactNode;
  /** Titre compact dans la barre fixe (apparaît au scroll). */
  titleCompact: ReactNode;
  /** Actions à gauche (retour, etc.). */
  leading?: ReactNode;
  /** Actions à droite (réglages, +, …). */
  trailing?: ReactNode;
  /** Bloc sous le grand titre, toujours dans le scroll (onglets, chips…). */
  belowLargeTitle?: ReactNode;
  className?: string;
  scrollClassName?: string;
  scrollRef?: RefObject<HTMLDivElement | null>;
  scrollProps?: HTMLAttributes<HTMLDivElement>;
  /** Hauteur utile de la rangée fixe sous la safe-area (px). */
  fixedToolbarPx?: number;
  /** Pixels de scroll avant début du fondu du blur (plus petit = réaction plus tôt). */
  blurStartPx?: number;
  /** Distance de scroll pour atteindre blur/titre compact à 100 %. */
  blurRangePx?: number;
  /**
   * Remplace tout le chrome « collapsing » (ex. mode sélection Messages).
   * Dans ce cas, le spacer haut est `fixedToolbarPx` + safe-area.
   */
  fixedOverlay?: ReactNode;
  /** Hauteur du spacer quand `fixedOverlay` est utilisé (px), hors safe-area. */
  fixedOverlayBodyPx?: number;
};

/**
 * Scroll principal avec contenu qui passe sous une zone haute fixe type App Store :
 * blur + fond translucide proportionnel au scroll, titre compact qui apparaît.
 */
export function IosAppStoreScrollLayout({
  titleLarge,
  titleCompact,
  leading,
  trailing,
  belowLargeTitle,
  children,
  className,
  scrollClassName,
  scrollRef,
  scrollProps,
  fixedToolbarPx = 44,
  blurStartPx = 2,
  blurRangePx = 40,
  fixedOverlay,
  fixedOverlayBodyPx = 52,
}: IosAppStoreScrollLayoutProps) {
  const localRef = useRef<HTMLDivElement>(null);
  const [y, setY] = useState(0);

  useLayoutEffect(() => {
    if (!scrollRef) return;
    scrollRef.current = localRef.current;
    return () => {
      if (scrollRef) scrollRef.current = null;
    };
  }, [scrollRef]);

  const { className: spClass, onScroll: spOnScroll, style: spStyle, ...restScroll } = scrollProps ?? {};

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    setY(e.currentTarget.scrollTop);
    spOnScroll?.(e);
  };

  const progress = fixedOverlay
    ? 1
    : Math.min(1, Math.max(0, (y - blurStartPx) / blurRangePx));

  const topPadLarge = `calc(env(safe-area-inset-top, 0px) + ${fixedToolbarPx}px)`;
  const topPadOverlay = `calc(env(safe-area-inset-top, 0px) + ${fixedOverlayBodyPx}px)`;

  const scrimHeight = `calc(env(safe-area-inset-top, 0px) + ${fixedToolbarPx}px + 1.5rem)`;

  return (
    <div className={cn("relative flex min-h-0 flex-1 flex-col overflow-hidden bg-secondary", className)}>
      {!fixedOverlay && (
        <div
          className="pointer-events-none fixed left-0 right-0 top-0 z-50"
          style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
        >
          <div
            className="absolute left-0 right-0 top-0 -z-10 overflow-hidden"
            style={{ height: scrimHeight, opacity: progress }}
            aria-hidden
          >
            <div className="ios-app-store-nav-scrim h-full w-full" />
          </div>
          <div
            className="pointer-events-auto flex w-full items-center gap-2 px-4 pb-1.5 pt-1"
            style={{ minHeight: fixedToolbarPx }}
          >
            <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2">
              <div className="flex min-w-0 justify-start">{leading ?? <span className="inline-block w-0" />}</div>
              <div
                className="flex min-w-0 max-w-[55vw] justify-center overflow-hidden transition-opacity duration-200 ease-out"
                style={{ opacity: progress }}
              >
                <div className="truncate text-center text-[17px] font-semibold leading-tight tracking-tight text-foreground">
                  {titleCompact}
                </div>
              </div>
              <div className="flex min-w-0 justify-end">{trailing ?? <span className="inline-block w-0" />}</div>
            </div>
          </div>
        </div>
      )}

      {fixedOverlay ? (
        <div className="fixed left-0 right-0 top-0 z-50 pt-[env(safe-area-inset-top,0px)]">
          <div className="ios-app-store-nav-scrim-solid border-b border-border/20">{fixedOverlay}</div>
        </div>
      ) : null}

      <div
        ref={localRef}
        className={cn(
          "ios-keyboard-scroll-body min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-secondary",
          !fixedOverlay && "ios-scroll-region",
          scrollClassName,
          spClass
        )}
        style={spStyle}
        onScroll={handleScroll}
        {...restScroll}
      >
        {fixedOverlay ? (
          <div className="shrink-0 bg-secondary" style={{ paddingTop: topPadOverlay }} aria-hidden />
        ) : (
          <>
            <div className="bg-secondary px-4 pb-2" style={{ paddingTop: topPadLarge }}>
              {titleLarge}
            </div>
            {belowLargeTitle}
          </>
        )}
        {children}
      </div>
    </div>
  );
}
