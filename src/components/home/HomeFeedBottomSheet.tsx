import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useAppContext, type HomeFeedSheetSnap } from "@/contexts/AppContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { HomeFeedSheetContent } from "./HomeFeedSheetContent";

const PEEK_HEIGHT_PX = 76;

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
  (heights as number[]).forEach((h, i) => {
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
  const { homeFeedSheetRequest, clearHomeFeedSheetRequest } = useAppContext();

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
  const [dragH, setDragH] = useState(heights[0]);
  const dragRef = useRef<DragRef | null>(null);
  const liveHeightRef = useRef(heights[0]);
  const dragMovedRef = useRef(false);

  useEffect(() => {
    if (!dragging) setDragH(heights[snap]);
  }, [heights, snap, dragging]);

  useEffect(() => {
    liveHeightRef.current = heights[snap];
  }, [heights, snap]);

  useEffect(() => {
    if (!homeFeedSheetRequest) return;
    setSnap(homeFeedSheetRequest.snap);
    clearHomeFeedSheetRequest();
  }, [homeFeedSheetRequest, clearHomeFeedSheetRequest]);

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
      const startH = heights[snap];
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
      const clamped = Math.max(heights[0], Math.min(heights[2], next));
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

  const peekActivate = useCallback(() => {
    if (dragMovedRef.current) return;
    if (snap === 0) setSnap(1);
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
        aria-label={t("tutorial.feedSheetScrimAria")}
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
        role="dialog"
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
        <div className="shrink-0">
          <button
            type="button"
            className="flex w-full flex-col items-center gap-1.5 pb-1 pt-2 touch-manipulation outline-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onClick={peekActivate}
            aria-expanded={snap >= 1}
          >
            <span className="h-1 w-10 shrink-0 rounded-full bg-muted-foreground/35 dark:bg-white/25" />
            <div className="flex w-full items-center justify-between gap-3 px-4 pb-1">
              <span className="min-w-0 truncate text-left text-[15px] font-semibold tracking-tight text-foreground">
                {t("navigation.feed")}
              </span>
              {snap === 0 ? (
                <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              ) : snap === 2 ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground/80" aria-hidden />
              ) : (
                <span className="h-4 w-4 shrink-0" aria-hidden />
              )}
            </div>
          </button>
        </div>

        {snap > 0 && (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <HomeFeedSheetContent
              sheetSnap={sheetSnapForContent}
              onBrandClick={() => setSnap(0)}
              scrollClassName="pb-2"
            />
          </div>
        )}
      </motion.div>
    </div>
  );
}
