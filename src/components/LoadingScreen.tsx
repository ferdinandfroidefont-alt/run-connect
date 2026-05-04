import { useState, useEffect, useRef, type CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import {
  RUCONNECT_SPLASH_BACKGROUND,
  RUCONNECT_LOADING_SCREEN_FALLBACK_URL,
  RUCONNECT_LOADING_SCREEN_GIF_URL,
  applyRuconnectSplashNativeChrome,
  applyRuconnectSplashWebChrome,
  restoreChromeAfterRuconnectSplash,
} from "@/lib/ruconnectSplashChrome";
import { scheduleHomeMapPrefetch } from "@/lib/homeMapPrefetch";

interface LoadingScreenProps {
  onLoadingComplete: () => void;
}

/** Durée minimale d’affichage du splash (visuel plein écran). */
const MIN_SPLASH_MS = 1200;
/** Plafond d’attente session : doit rester > MIN_SPLASH_MS pour respecter le minimum. */
const MAX_WAIT_SESSION_MS = 12000;

function waitMs(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export const LoadingScreen = ({ onLoadingComplete }: LoadingScreenProps) => {
  const [exiting, setExiting] = useState(false);
  const [assetFailed, setAssetFailed] = useState(false);
  const [splashSrc, setSplashSrc] = useState(RUCONNECT_LOADING_SCREEN_GIF_URL);
  const splashTierRef = useRef<"gif" | "jpg">("gif");
  const { t } = useLanguage();
  const onCompleteRef = useRef(onLoadingComplete);
  const completeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  onCompleteRef.current = onLoadingComplete;

  // Dépendances vides : si `t` (LanguageContext) change pendant le boot, un re-run coupait le splash
  // (cleanup → restoreChrome) et recréait l’effet — ressenti « double chargement » / barre d’état incohérente.
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
      const sessionPromise = supabase.auth.getSession().then(() => {}).catch(() => {});

      const capped = new Promise<void>((resolve) => {
        window.setTimeout(resolve, MAX_WAIT_SESSION_MS);
      });

      await Promise.race([Promise.all([minElapsed, sessionPromise]), capped]);

      if (cancelled) return;
      setExiting(true);
      completeTimerRef.current = setTimeout(() => {
        if (!cancelled) onCompleteRef.current();
        completeTimerRef.current = null;
      }, 90);
    })();

    return () => {
      cancelled = true;
      if (completeTimerRef.current) {
        window.clearTimeout(completeTimerRef.current);
        completeTimerRef.current = null;
      }
      void restoreAfterSplash();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- boot unique ; voir commentaire ci-dessus
  }, []);

  const splashLayerStyle: CSSProperties = { backgroundColor: RUCONNECT_SPLASH_BACKGROUND };

  return (
    <AnimatePresence>
      {!exiting ? (
        <motion.div
          key="splash"
          role="status"
          aria-busy="true"
          aria-live="polite"
          className="fixed inset-0 z-[100] flex min-h-[100dvh] w-full flex-col overflow-hidden"
          style={splashLayerStyle}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: [0.32, 0.72, 0, 1] }}
        >
          <span className="sr-only">{t("loading.splashAria")}</span>
          {!assetFailed ? (
            <img
              src={splashSrc}
              alt=""
              decoding="async"
              draggable={false}
              className="pointer-events-none absolute inset-0 block h-full w-full select-none object-cover object-center"
              onError={() => {
                if (splashTierRef.current === "gif") {
                  splashTierRef.current = "jpg";
                  setSplashSrc(RUCONNECT_LOADING_SCREEN_FALLBACK_URL);
                  return;
                }
                setAssetFailed(true);
              }}
            />
          ) : null}
        </motion.div>
      ) : (
        <motion.div
          key="splash-exit"
          className="pointer-events-none fixed inset-0 z-[100]"
          style={{ backgroundColor: RUCONNECT_SPLASH_BACKGROUND }}
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.14, ease: [0.32, 0.72, 0, 1] }}
        />
      )}
    </AnimatePresence>
  );
};
