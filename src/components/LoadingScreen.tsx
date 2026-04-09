import { useState, useEffect, useRef, type CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import {
  RUCONNECT_SPLASH_BLUE,
  RUCONNECT_SPLASH_ICON_URL,
  applyRuconnectSplashNativeChrome,
  applyRuconnectSplashWebChrome,
  restoreChromeAfterRuconnectSplash,
} from "@/lib/ruconnectSplashChrome";
import { scheduleHomeMapPrefetch } from "@/lib/homeMapPrefetch";

interface LoadingScreenProps {
  onLoadingComplete: () => void;
}

const MIN_SPLASH_MS = 220;
const MAX_WAIT_SESSION_MS = 1500;

function waitMs(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export const LoadingScreen = ({ onLoadingComplete }: LoadingScreenProps) => {
  const [exiting, setExiting] = useState(false);
  const [bootPhase, setBootPhase] = useState<"session" | "ready">("session");
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
        .then(() => {
          if (!cancelled) setBootPhase("ready");
        })
        .catch(() => {
          
          if (!cancelled) setBootPhase("ready");
        });

      const capped = new Promise<void>((resolve) => {
        window.setTimeout(resolve, MAX_WAIT_SESSION_MS);
      });

      await Promise.race([Promise.all([minElapsed, sessionPromise]), capped]);

      if (cancelled) return;
      setExiting(true);
      completeTimerRef.current = setTimeout(() => {
        bootLog("[LoadingScreen] onLoadingComplete");
        if (!cancelled) onCompleteRef.current();
        completeTimerRef.current = null;
      }, 180);
    })();

    return () => {
      cancelled = true;
      if (completeTimerRef.current) {
        window.clearTimeout(completeTimerRef.current);
        completeTimerRef.current = null;
      }
      void restoreAfterSplash();
    };
  }, [t]);

  const splashLayerStyle: CSSProperties = {
    backgroundColor: RUCONNECT_SPLASH_BLUE,
  };

  const logoEdge = "clamp(10rem, min(72vw, 40dvh), 19rem)";

  const logoBoxStyle: CSSProperties = {
    width: logoEdge,
    height: logoEdge,
    maxWidth: "min(84vw, 19rem)",
    maxHeight: "min(84vw, 19rem)",
  };

  const titleStyle: CSSProperties = {
    fontSize: `clamp(1.18rem, min(calc(${logoEdge} / 6.35), 1.88rem), 1.88rem)`,
    marginTop: "clamp(0.45rem, min(1.75dvh, 0.95rem), 1.05rem)",
    maxWidth: logoEdge,
  };

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
          transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
        >
          <span className="sr-only">{t("loading.splashAria")}</span>
          <div
            className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center px-5"
            style={{
              paddingTop: "env(safe-area-inset-top, 0px)",
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
                mass: 0.85,
              }}
              className="flex flex-col items-center"
            >
              <div
                className="flex flex-col items-center"
                style={{
                  transform: "translateY(calc(-1 * min(2.85dvh, 1.2rem)))",
                }}
              >
                <img
                  src={RUCONNECT_SPLASH_ICON_URL}
                  alt=""
                  draggable={false}
                  className="block shrink-0 select-none object-contain"
                  style={logoBoxStyle}
                />
                <motion.p
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.06,
                    type: "spring",
                    stiffness: 340,
                    damping: 32,
                  }}
                  className="font-sans text-center font-bold leading-none tracking-[0.03em] text-white antialiased"
                  style={titleStyle}
                >
                  RunConnect
                </motion.p>
              </div>
              <p className="mt-4 max-w-[min(18rem,88vw)] text-center text-[13px] font-medium leading-snug text-white/85">
                {bootPhase === "session" ? t("loading.stepSession") : t("loading.stepSessionDone")}
              </p>
              <div className="mt-3 flex gap-1.5" aria-hidden>
                <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-white/90 [animation-delay:-0.3s]" />
                <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-white/90 [animation-delay:-0.15s]" />
                <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-white/90" />
              </div>
            </motion.div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="splash-exit"
          className="pointer-events-none fixed inset-0 z-[100]"
          style={{ backgroundColor: RUCONNECT_SPLASH_BLUE }}
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
        />
      )}
    </AnimatePresence>
  );
};
