import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
} from "react";
import { cn } from "@/lib/utils";
import { isIosAppShell } from "@/lib/iosAppShell";

export type IosFixedPageHeaderShellProps = {
  header: ReactNode;
  headerWrapperClassName?: string;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  /**
   * true = le bloc sous le header ne scroll pas (ex. ScrollArea enfant qui gère le scroll).
   * false = cette zone a overflow-y auto (fil, messages liste, etc.).
   */
  contentScroll?: boolean;
  scrollRef?: RefObject<HTMLDivElement | null>;
  scrollClassName?: string;
  scrollProps?: HTMLAttributes<HTMLDivElement>;
  contentTopOffsetPx?: number;
};

/**
 * Sur iOS : barre interne (Retour / titre) ancrée en haut du cadre visible quand le clavier s’ouvre.
 * Hors iOS : en-tête dans le flux, comportement inchangé visuellement.
 */
export function IosFixedPageHeaderShell({
  header,
  headerWrapperClassName,
  footer,
  children,
  className,
  contentScroll = false,
  scrollRef,
  scrollClassName,
  scrollProps,
  contentTopOffsetPx = 12,
}: IosFixedPageHeaderShellProps) {
  const [pin] = useState(() => isIosAppShell());
  const headerRef = useRef<HTMLDivElement>(null);
  const localScrollRef = useRef<HTMLDivElement>(null);
  /** Sous iOS (header fixe), valeur de secours jusqu’à la mesure — évite le contenu sous le header au 1er rendu / dans les modales. */
  const [padPx, setPadPx] = useState(() => {
    if (!isIosAppShell()) return 0;
    const raw = getComputedStyle(document.documentElement).getPropertyValue("--safe-area-top").trim();
    const safeTop = Number.isFinite(parseFloat(raw)) ? parseFloat(raw) : 0;
    return Math.ceil(safeTop + 54);
  });

  useLayoutEffect(() => {
    if (!contentScroll && scrollRef && localScrollRef.current) {
      (scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = localScrollRef.current;
    }
    return () => {
      if (!contentScroll && scrollRef) (scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = null;
    };
  }, [scrollRef, contentScroll]);

  useLayoutEffect(() => {
    if (!pin) return;
    const el = headerRef.current;
    if (!el) return;
    const sync = () => {
      /* +1 px : évite qu’un filet de contenu reste sous le header (arrondis / sous-pixels iOS). */
      setPadPx(Math.ceil(el.getBoundingClientRect().height) + 1);
    };
    sync();
    requestAnimationFrame(() => {
      sync();
      requestAnimationFrame(sync);
    });
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    const vv = window.visualViewport;
    vv?.addEventListener?.("resize", sync);
    vv?.addEventListener?.("scroll", sync);
    return () => {
      ro.disconnect();
      vv?.removeEventListener?.("resize", sync);
      vv?.removeEventListener?.("scroll", sync);
    };
  }, [pin]);

  useEffect(() => {
    if (!pin || typeof document === "undefined") return;

    const isEditableTarget = (node: EventTarget | null): boolean => {
      const el = node instanceof HTMLElement ? node : null;
      if (!el) return false;
      return !!el.closest("input, textarea, [contenteditable='true']");
    };

    const pinViewportTop = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    let keyboardEditing = false;

    const onFocusIn = (event: FocusEvent) => {
      if (!isEditableTarget(event.target)) return;
      keyboardEditing = true;
      pinViewportTop();
      requestAnimationFrame(pinViewportTop);
      window.setTimeout(pinViewportTop, 120);
    };

    const onFocusOut = () => {
      window.setTimeout(() => {
        const active = document.activeElement;
        keyboardEditing = isEditableTarget(active);
      }, 0);
    };

    const onViewportShift = () => {
      if (!keyboardEditing) return;
      pinViewportTop();
    };

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    window.visualViewport?.addEventListener("resize", onViewportShift);
    window.visualViewport?.addEventListener("scroll", onViewportShift);

    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      window.visualViewport?.removeEventListener("resize", onViewportShift);
      window.visualViewport?.removeEventListener("scroll", onViewportShift);
    };
  }, [pin]);

  const { className: scrollPropClass, style: scrollPropStyle, ...restScroll } = scrollProps ?? {};

  const padStyle =
    pin && padPx > 0 ? { paddingTop: padPx + Math.max(0, contentTopOffsetPx) } : undefined;

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden", className)}>
      <div
        ref={headerRef}
        data-ios-pinned-header={pin ? "" : undefined}
        className={cn(pin ? "ios-internal-header-pinned" : "shrink-0", headerWrapperClassName)}
      >
        {header}
      </div>

      {contentScroll ? (
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-hidden",
            scrollClassName,
            scrollPropClass
          )}
          style={{ ...padStyle, ...scrollPropStyle }}
          {...restScroll}
        >
          {children}
        </div>
      ) : (
        <div
          ref={localScrollRef}
          className={cn(
            "ios-keyboard-scroll-body flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden",
            !pin && "ios-scroll-region",
            scrollClassName,
            scrollPropClass
          )}
          style={{ ...padStyle, ...scrollPropStyle }}
          {...restScroll}
        >
          {children}
        </div>
      )}

      {footer}
    </div>
  );
}
