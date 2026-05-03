import { useState, useEffect, useRef, type CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import {
  RUCONNECT_SPLASH_BACKGROUND,
  RUCONNECT_SPLASH_ICON_URL,
  applyRuconnectSplashNativeChrome,
  applyRuconnectSplashWebChrome,
  restoreChromeAfterRuconnectSplash,
} from "@/lib/ruconnectSplashChrome";
import { scheduleHomeMapPrefetch } from "@/lib/homeMapPrefetch";

interface LoadingScreenProps {
  onLoadingComplete: () => void;
}

/** Durée minimale d’affichage du splash (identité plein écran). */
const MIN_SPLASH_MS = 1200;
/** Plafond d’attente session : doit rester > MIN_SPLASH_MS pour respecter le minimum. */
const MAX_WAIT_SESSION_MS = 12000;

function waitMs(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export const LoadingScreen = ({ onLoadingComplete }: LoadingScreenProps) => {
  const [exiting, setExiting] = useState(false);
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
  const iconStyle: CSSProperties = { width: "clamp(120px, 30vw, 140px)", height: "clamp(120px, 30vw, 140px)" };

  return (
    <AnimatePresence>
      {!exiting ? (
        <motion.div
          key="splash"
          role="status"
          aria-busy="true"
          aria-live="polite"
          className="fixed inset-0 z-[100] flex min-h-0 flex-col overflow-hidden"
          style={splashLayerStyle}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: [0.32, 0.72, 0, 1] }}
        >
          <span className="sr-only">{t("loading.splashAria")}</span>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col px-6" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
            <div className="flex min-h-0 flex-1 items-center justify-center">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
                className="flex flex-col items-center"
              >
                <div className="relative mb-8 flex items-center justify-center" style={iconStyle}>
                  {[0, 1, 2].map((wave) => (
                    <motion.span
                      key={wave}
                      className="absolute rounded-full border"
                      style={{ borderColor: "rgba(255,255,255,0.45)", inset: 0 }}
                      animate={{ scale: [1, 1.8], opacity: [0.28, 0] }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: wave * 0.32,
                      }}
                    />
                  ))}
                  <img
                    src={RUCONNECT_SPLASH_ICON_URL}
                    alt="RunConnect"
                    draggable={false}
                    className="relative z-10 block h-full w-full select-none object-contain"
                  />
                </div>

                <h1 className="text-[28px] font-bold tracking-[0.08em] text-white">
                  RUNCONNECT
                </h1>
                <p className="mt-2 text-[12px] font-medium tracking-[0.24em] text-white/70">
                  TROUVE. CONNECTE. PARTAGE.
                </p>
                <p className="mt-5 text-[12px] text-white/55">Connexion en cours...</p>
              </motion.div>
            </div>

            <div className="pb-[max(8px,env(safe-area-inset-bottom,0px))]">
              <div className="relative h-[3px] w-full overflow-hidden rounded-full bg-white/15">
                <motion.div
                  className="absolute inset-y-0 w-[40%] rounded-full"
                  style={{ backgroundColor: "#FFFFFF" }}
                  animate={{ x: ["-45%", "250%"] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
            </div>
          </div>
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
