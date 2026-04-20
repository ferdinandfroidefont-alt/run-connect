import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useAppContext, type HomeFeedSheetSnap } from "@/contexts/AppContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { HomeFeedSheetContent } from "./HomeFeedSheetContent";

/** Sync avec `index.css` → `--home-feed-sheet-peek` (colonne carte). */
const PEEK_HEIGHT_PX = 68;

const SPRING = { type: "spring" as const, stiffness: 440, damping: 36, mass: 0.85 };

function useInnerHeight() {
  const [h, setH] = useState(() =>
    typeof window !== "undefined" ? window.innerHeight : 640,
  );
  useEffect(() => {
    const onResize = () => setH(window.innerHeight);
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
    };
  }, []);
  return h;
}

function useSafeAreaTopPx() {
  const [top, setTop] = useState(0);
  useEffect(() => {
    const read = () => {
      const raw = getComputedStyle(document.documentElement).getPropertyValue("--safe-area-top").trim();
      const n = parseFloat(raw);
      setTop(Number.isFinite(n) ? n : 0);
    };
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);
  return top;
}

function nearestSnapIndex(height: number, heights: readonly [number, number, number]): HomeFeedSheetSnap {
  let best: HomeFeedSheetSnap = 0;
  let bestD = Infinity;
  ([...heights] as number[]).forEach((h, i) => {
    const d = Math.abs(height - h);
    if (d < bestD) {
      bestD = d;
      best = i as HomeFeedSheetSnap;
    }
  });
  return best;
}

type DragRef = { startY: number; startH: number; pointerId: number };

/**
 * Bottom sheet Feed sur l’accueil : carte plein écran, trois paliers (aperçu / mi-hauteur / quasi plein écran),
 * glisser depuis la poignée, snap ressort.
 */
export function HomeFeedBottomSheet() {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const ih = useInnerHeight();
  const safeTop = useSafeAreaTopPx();
  const { homeFeedSheetRequest, clearHomeFeedSheetRequest, setHomeFeedSheetSnap } = useAppContext();

  const heights = useMemo(() => {
    const full = Math.max(PEEK_HEIGHT_PX + 120, ih - safeTop - 10);
    const half = Math.round(
      Math.min(full - 32, Math.max(PEEK_HEIGHT_PX + 140, Math.round(ih * 0.46))),
    );
    const peek = PEEK_HEIGHT_PX;
    return [peek, half, full] as const;
  }, [ih, safeTop]);

  const [snap, setSnap] = useState<HomeFeedSheetSnap>(0);
  const [dragging, setDragging] = useState(false);
  const [dragH, setDragH] = useState<number>(heights[0]);
  const dragRef = useRef<DragRef | null>(null);
  const liveHeightRef = useRef<number>(heights[0] as number);
  const dragMovedRef = useRef(false);

  useEffect(() => {
    if (!dragging) setDragH(heights[snap]);
  }, [heights, snap, dragging]);

  useEffect(() => {
    liveHeightRef.current = heights[snap] as number;
  }, [heights, snap]);

  useEffect(() => {
    if (!homeFeedSheetRequest) return;
    setSnap(homeFeedSheetRequest.snap);
    clearHomeFeedSheetRequest();
  }, [homeFeedSheetRequest, clearHomeFeedSheetRequest]);

  useEffect(() => {
    setHomeFeedSheetSnap(snap);
    return () => setHomeFeedSheetSnap(0);
  }, [snap, setHomeFeedSheetSnap]);

  const targetH = dragging ? dragH : heights[snap];

  const endDrag = useCallback(() => {
    dragRef.current = null;
    setDragging(false);
    setSnap(nearestSnapIndex(liveHeightRef.current, heights));
  }, [heights]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      dragMovedRef.current = false;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      const startH = heights[snap] as number;
      dragRef.current = { startY: e.clientY, startH, pointerId: e.pointerId };
      liveHeightRef.current = startH;
      setDragging(true);
      setDragH(startH);
    },
    [heights, snap],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current || e.pointerId !== dragRef.current.pointerId) return;
      const { startY, startH } = dragRef.current;
      if (Math.abs(e.clientY - startY) > 6) dragMovedRef.current = true;
      const dy = e.clientY - startY;
      const next = Math.round(startH - dy);
      const clamped = Math.max(heights[0] as number, Math.min(heights[2] as number, next));
      liveHeightRef.current = clamped;
      setDragH(clamped);
    },
    [heights],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current || e.pointerId !== dragRef.current.pointerId) return;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      endDrag();
    },
    [endDrag],
  );

  /** Tap poignée / flèche : ouvrir tout de suite en quasi plein écran (pas seulement mi-hauteur). */
  const peekActivate = useCallback(() => {
    if (dragMovedRef.current) return;
    if (snap === 0 || snap === 1) setSnap(2);
  }, [snap]);

  const sheetSnapForContent: 1 | 2 = snap >= 2 ? 2 : 1;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[102] flex flex-col justify-end"
      style={{ bottom: "var(--layout-bottom-inset, 0px)" }}
    >
      <motion.button
        type="button"
        tabIndex={-1}
        aria-hidden={snap === 0}
        aria-label={snap === 0 ? undefined : t("tutorial.feedSheetScrimAria")}
        className={cn(
          "absolute inset-x-0 top-0 border-0 p-0 bg-black/25 dark:bg-black/35",
          snap === 0 ? "pointer-events-none" : "pointer-events-auto cursor-default",
        )}
        initial={false}
        animate={{ opacity: snap === 0 ? 0 : 0.32 }}
        transition={
          reduceMotion
            ? { duration: 0.2 }
            : { type: "spring", stiffness: 380, damping: 42 }
        }
        onClick={() => setSnap(0)}
      />

      <motion.div
        data-home-feed-sheet
        role={snap >= 1 ? "dialog" : "region"}
        aria-modal={snap >= 1}
        aria-label={t("navigation.feed")}
        className={cn(
          "pointer-events-auto relative flex min-h-0 w-full flex-col overflow-hidden",
          "rounded-t-[1.25rem] border border-border/50 bg-background/92 shadow-[0_-12px_48px_rgba(0,0,0,0.18)]",
          "backdrop-blur-xl dark:border-[#2a2a2a] dark:bg-black/90 dark:shadow-[0_-16px_56px_rgba(0,0,0,0.55)]",
        )}
        initial={false}
        animate={{ height: targetH }}
        transition={
          dragging || reduceMotion
            ? { duration: 0 }
            : SPRING
        }
      >
        {snap === 0 ? (
          <div
            className="flex min-h-0 flex-1 flex-col justify-start pt-1.5"
            data-tutorial="home-feed-sheet-handle"
          >
            <button
              type="button"
              className="flex min-h-[44px] w-full items-center justify-between gap-3 px-4 pb-1 outline-none touch-manipulation active:opacity-80"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onClick={peekActivate}
              aria-expanded={false}
              aria-label={t("navigation.feed")}
            >
              <span className="text-[15px] font-semibold leading-none tracking-tight text-foreground/90">
                {t("navigation.feed")}
              </span>
              <ChevronUp className="h-5 w-5 shrink-0 text-muted-foreground/85" aria-hidden />
            </button>
          </div>
        ) : (
          <>
            <div
              className="relative flex shrink-0 justify-center bg-background pt-2"
              data-tutorial="home-feed-sheet-handle"
            >
              <button
                type="button"
                className="flex w-full flex-col items-center justify-center py-2 outline-none touch-manipulation active:opacity-80"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onClick={peekActivate}
                aria-expanded
                aria-label={t("navigation.feed")}
              >
                <span className="h-1 w-10 shrink-0 rounded-full bg-muted-foreground/35 dark:bg-white/25" />
              </button>
              <button
                type="button"
                className="absolute right-3 top-2 flex touch-manipulation items-center justify-center rounded-lg p-2 outline-none active:opacity-70"
                aria-label={t("tutorial.feedSheetScrimAria")}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setSnap(0);
                }}
              >
                <ChevronDown className="h-5 w-5 text-muted-foreground" aria-hidden />
              </button>
            </div>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <HomeFeedSheetContent
                sheetSnap={sheetSnapForContent}
                onBrandClick={() => setSnap(0)}
                scrollClassName="pb-2"
              />
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
