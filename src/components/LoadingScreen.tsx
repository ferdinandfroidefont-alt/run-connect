import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import {
  applyRuconnectSplashNativeChrome,
  applyRuconnectSplashWebChrome,
  restoreChromeAfterRuconnectSplash,
} from "@/lib/ruconnectSplashChrome";
import { scheduleHomeMapPrefetch } from "@/lib/homeMapPrefetch";
import { RunConnectAnimatedSplash } from "@/components/RunConnectAnimatedSplash";

interface LoadingScreenProps {
  onLoadingComplete: () => void;
}

/**
 * Durée minimale alignée sur la maquette (19) : duration 2200 ms puis fade-out.
 * Plafond d’attente session : doit rester > MIN_SPLASH_MS.
 */
const MIN_SPLASH_MS = 2200;
const MAX_WAIT_SESSION_MS = 12000;
const EXIT_FADE_MS = 400;

function waitMs(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export const LoadingScreen = ({ onLoadingComplete }: LoadingScreenProps) => {
  const [exiting, setExiting] = useState(false);
  const { t } = useLanguage();
  const onCompleteRef = useRef(onLoadingComplete);
  const completeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  onCompleteRef.current = onLoadingComplete;

  useEffect(() => {
    scheduleHomeMapPrefetch();
    applyRuconnectSplashWebChrome();
    void applyRuconnectSplashNativeChrome();

    let afterSplashApplied = false;
    const restoreAfterSplash = async () => {
      if (afterSplashApplied) return;
      afterSplashApplied = true;
      await restoreChromeAfterRuconnectSplash();
    };

    let cancelled = false;

    void (async () => {
      const minElapsed = waitMs(MIN_SPLASH_MS);
      const sessionPromise = supabase.auth
        .getSession()
        .then(() => {})
        .catch(() => {});

      const capped = new Promise<void>((resolve) => {
        window.setTimeout(resolve, MAX_WAIT_SESSION_MS);
      });

      await Promise.race([Promise.all([minElapsed, sessionPromise]), capped]);

      if (cancelled) return;
      setExiting(true);
      completeTimerRef.current = setTimeout(() => {
        if (!cancelled) onCompleteRef.current();
        completeTimerRef.current = null;
      }, EXIT_FADE_MS);
    })();

    return () => {
      cancelled = true;
      if (completeTimerRef.current) {
        window.clearTimeout(completeTimerRef.current);
        completeTimerRef.current = null;
      }
      void restoreAfterSplash();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- boot unique
  }, []);

  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <RunConnectAnimatedSplash
        className="z-[100]"
        exiting={exiting}
        barFillDurationMs={MIN_SPLASH_MS - 200}
      />
      <span className="sr-only">{t("loading.splashAria")}</span>
    </div>
  );
};
