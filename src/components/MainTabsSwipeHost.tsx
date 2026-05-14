import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { TabPaneErrorBoundary } from "@/components/TabPaneErrorBoundary";

const Index = lazy(() => import("@/pages/Index"));
const MySessions = lazy(() => import("@/pages/MySessions"));
const Messages = lazy(() => import("@/pages/Messages"));
const DiscoverRouteCreationPage = lazy(() => import("@/pages/DiscoverRouteCreationPage"));
const Coaching = lazy(() => import("@/pages/Coaching"));

type TabDef = {
  path: string;
  render: () => ReactNode;
};

const TABS: TabDef[] = [
  { path: "/", render: () => <Index /> },
  { path: "/my-sessions", render: () => <MySessions /> },
  { path: "/messages", render: () => <Messages /> },
  { path: "/route-create", render: () => <DiscoverRouteCreationPage /> },
  { path: "/coaching", render: () => <Coaching /> },
];

const SWIPE_INTENT_RATIO = 1.25;
const SWIPE_START_PX = 10;

export function MainTabsSwipeHost() {
  const location = useLocation();
  const navigate = useNavigate();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef({
    active: false,
    horizontal: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    startTs: 0,
  });

  const pathToIndex = useMemo(() => new Map(TABS.map((t, idx) => [t.path, idx])), []);
  const activeIndex = pathToIndex.get(location.pathname) ?? 0;
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [visited, setVisited] = useState<Record<string, boolean>>({ "/": true });

  useEffect(() => {
    setVisited((prev) => (prev[location.pathname] ? prev : { ...prev, [location.pathname]: true }));
  }, [location.pathname]);

  useEffect(() => {
    if (!dragging) setDragX(0);
  }, [dragging, activeIndex]);

  const canSwipe = useCallback((target: EventTarget | null) => {
    const node = target instanceof Element ? target : null;
    if (!node) return true;
    if (
      node.closest(
        "input, textarea, select, button, [contenteditable='true'], [data-no-tab-swipe='true'], [role='menu'], [role='menuitem'], [data-radix-dropdown-menu-content], [data-radix-dialog-content]"
      )
    ) {
      return false;
    }
    let current: Element | null = node;
    while (current) {
      const el = current as HTMLElement;
      if (el.scrollWidth > el.clientWidth + 8) return false;
      current = current.parentElement;
    }
    return true;
  }, []);

  const onPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (!canSwipe(e.target)) return;
      /*
       * Ne pas capturer le pointeur tant qu’un swipe horizontal n’est pas affirmé :
       * sinon le viewport reçoit tout le flux d’événements et le scroll vertical des pages
       * (Découvrir, listes, etc.) est bloqué.
       */
      dragRef.current = {
        active: true,
        horizontal: false,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startTs: performance.now(),
      };
    },
    [canSwipe]
  );

  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const st = dragRef.current;
      if (!st.active || st.pointerId !== e.pointerId) return;

      const dx = e.clientX - st.startX;
      const dy = e.clientY - st.startY;
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);

      if (!st.horizontal) {
        if (adx < SWIPE_START_PX && ady < SWIPE_START_PX) return;
        if (adx > ady * SWIPE_INTENT_RATIO) {
          st.horizontal = true;
          setDragging(true);
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            /* déjà capturé / contexte fermé */
          }
        } else {
          st.active = false;
          setDragging(false);
          setDragX(0);
          return;
        }
      }

      const atFirst = activeIndex === 0;
      const atLast = activeIndex === TABS.length - 1;
      let clamped = dx;
      if ((atFirst && dx > 0) || (atLast && dx < 0)) clamped = dx * 0.32;
      setDragX(clamped);
      e.preventDefault();
    },
    [activeIndex]
  );

  const onPointerEnd = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const st = dragRef.current;
      if (!st.active || st.pointerId !== e.pointerId) return;

      const wasHorizontal = st.horizontal;

      try {
        if (typeof e.currentTarget.hasPointerCapture === "function") {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
          }
        }
      } catch {
        /* ignore */
      }

      st.active = false;

      if (!wasHorizontal) {
        setDragging(false);
        setDragX(0);
        return;
      }

      const width = viewportRef.current?.clientWidth || window.innerWidth || 1;
      const elapsed = Math.max(1, performance.now() - st.startTs);
      const velocity = dragX / elapsed;
      const threshold = Math.max(56, width * 0.22);

      let next = activeIndex;
      if (dragX <= -threshold || velocity <= -0.45) next = Math.min(TABS.length - 1, activeIndex + 1);
      if (dragX >= threshold || velocity >= 0.45) next = Math.max(0, activeIndex - 1);

      setDragging(false);
      setDragX(0);
      if (next !== activeIndex) navigate(TABS[next].path);
    },
    [activeIndex, dragX, navigate]
  );

  return (
    <div
      ref={viewportRef}
      className="relative flex min-h-0 flex-1 overflow-hidden touch-pan-y"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
    >
      {TABS.map((tab, idx) => {
        const isActive = idx === activeIndex;
        const shouldRender = visited[tab.path] || Math.abs(idx - activeIndex) <= 1;
        const txPercent = (idx - activeIndex) * 100;
        const transition = dragging ? "none" : "transform 340ms cubic-bezier(0.22, 1, 0.36, 1)";

        return (
          <div
            key={tab.path}
            className="absolute inset-0 min-h-0"
            style={{
              transform: `translate3d(calc(${txPercent}% + ${dragX}px), 0, 0)`,
              transition,
              willChange: "transform",
              pointerEvents: isActive ? "auto" : "none",
            }}
          >
            {shouldRender ? (
              <Suspense
                fallback={
                  <div className="flex min-h-[50dvh] items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                }
              >
                <TabPaneErrorBoundary key={tab.path}>
                  <div className="pointer-events-auto flex h-full min-h-0 flex-col">{tab.render()}</div>
                </TabPaneErrorBoundary>
              </Suspense>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

