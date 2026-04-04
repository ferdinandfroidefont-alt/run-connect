import { lazy, Suspense, useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import type { TutorialStep } from "@/lib/tutorials/types";
import {
  TUTORIAL_REPLAY_DEFINITIONS,
  readPendingTutorialReplay,
  clearPendingTutorialReplay,
  pathMatchesTutorial,
  type TutorialReplayId,
} from "@/lib/tutorials/registry";
import { useAppContext } from "@/contexts/AppContext";

const InteractiveTutorial = lazy(() =>
  import("@/components/InteractiveTutorial").then((m) => ({ default: m.InteractiveTutorial }))
);

function waitForSelector(selector: string, timeoutMs: number, intervalMs: number): Promise<boolean> {
  const start = Date.now();
  return new Promise((resolve) => {
    const tick = () => {
      try {
        if (selector && document.querySelector(selector)) {
          resolve(true);
          return;
        }
      } catch {
        resolve(false);
        return;
      }
      if (Date.now() - start >= timeoutMs) {
        resolve(false);
        return;
      }
      window.setTimeout(tick, intervalMs);
    };
    tick();
  });
}

const TUTORIAL_REPLAY_EVENT = "runconnect-tutorial-replay";

/**
 * Relance les tutoriels demandés depuis les paramètres : navigation puis même UI que le tutoriel du premier lancement.
 * Ne modifie pas `tutorial_completed` — uniquement pour les rejoueurs manuels.
 */
export function TutorialReplayHost() {
  const { t } = useLanguage();
  const { requestHomeFeedSheetSnap } = useAppContext();
  const location = useLocation();
  const [replay, setReplay] = useState<{ id: TutorialReplayId; steps: TutorialStep[]; key: number } | null>(
    null
  );
  const keyRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  const tryStartPending = useCallback(() => {
    const pending = readPendingTutorialReplay();
    if (!pending) return;

    const def = TUTORIAL_REPLAY_DEFINITIONS[pending];
    if (!def || !pathMatchesTutorial(location.pathname, def)) return;

    clearPendingTutorialReplay();

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    cancelledRef.current = false;
    timerRef.current = window.setTimeout(() => {
      void (async () => {
        if (def.id === "feed") {
          requestHomeFeedSheetSnap(1);
          await new Promise((r) => window.setTimeout(r, 120));
        }
        const steps = def.getSteps(t);
        const first = steps[0]?.target;
        if (first) {
          const extra = def.waitForTargetExtraMs ?? 0;
          await waitForSelector(first, 4200 + extra, 120);
        }
        if (cancelledRef.current) return;
        keyRef.current += 1;
        setReplay({ id: pending, steps, key: keyRef.current });
      })();
    }, def.startDelayMs);
  }, [location.pathname, requestHomeFeedSheetSnap, t]);

  useEffect(() => {
    tryStartPending();

    const onQueued = () => tryStartPending();
    window.addEventListener(TUTORIAL_REPLAY_EVENT, onQueued);

    return () => {
      window.removeEventListener(TUTORIAL_REPLAY_EVENT, onQueued);
      cancelledRef.current = true;
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [location.pathname, location.search, tryStartPending]);

  const dismiss = () => setReplay(null);

  if (!replay) return null;

  return (
    <Suspense fallback={null}>
      <InteractiveTutorial
        key={replay.key}
        steps={replay.steps}
        onComplete={dismiss}
        onSkip={dismiss}
      />
    </Suspense>
  );
}
