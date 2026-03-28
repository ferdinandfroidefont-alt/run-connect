import {
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
}: IosFixedPageHeaderShellProps) {
  const [pin] = useState(() => isIosAppShell());
  const headerRef = useRef<HTMLDivElement>(null);
  const localScrollRef = useRef<HTMLDivElement>(null);
  const [padPx, setPadPx] = useState(0);

  useLayoutEffect(() => {
    if (!contentScroll && scrollRef && localScrollRef.current) {
      scrollRef.current = localScrollRef.current;
    }
    return () => {
      if (!contentScroll && scrollRef) scrollRef.current = null;
    };
  }, [scrollRef, contentScroll]);

  useLayoutEffect(() => {
    if (!pin) return;
    const el = headerRef.current;
    if (!el) return;
    const sync = () => {
      setPadPx(Math.ceil(el.getBoundingClientRect().height));
    };
    sync();
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

  const { className: scrollPropClass, style: scrollPropStyle, ...restScroll } = scrollProps ?? {};

  const padStyle = pin && padPx > 0 ? { paddingTop: padPx } : undefined;

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden", className)}>
      <div
        ref={headerRef}
        className={cn(pin ? "ios-internal-header-pinned" : "shrink-0", headerWrapperClassName)}
      >
        {header}
      </div>

      {contentScroll ? (
        <div
          className={cn("flex min-h-0 flex-1 flex-col overflow-hidden", scrollClassName, scrollPropClass)}
          style={{ ...padStyle, ...scrollPropStyle }}
          {...restScroll}
        >
          {children}
        </div>
      ) : (
        <div
          ref={localScrollRef}
          className={cn(
            "ios-keyboard-scroll-body min-h-0 flex-1 overflow-y-auto overflow-x-hidden",
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
