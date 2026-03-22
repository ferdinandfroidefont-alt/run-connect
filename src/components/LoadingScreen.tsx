import { useState, useEffect, type CSSProperties } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RUCONNECT_SPLASH_BLUE,
  RUCONNECT_SPLASH_ICON_URL,
  applyRuconnectSplashNativeChrome,
  applyRuconnectSplashWebChrome,
  restoreChromeAfterRuconnectSplash,
} from '@/lib/ruconnectSplashChrome';

interface LoadingScreenProps {
  onLoadingComplete: () => void;
}

export const LoadingScreen = ({ onLoadingComplete }: LoadingScreenProps) => {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    applyRuconnectSplashWebChrome();
    void applyRuconnectSplashNativeChrome();

    let afterSplashApplied = false;
    const restoreAfterSplash = async () => {
      if (afterSplashApplied) return;
      afterSplashApplied = true;
      await restoreChromeAfterRuconnectSplash();
    };

    const exitTimer = setTimeout(() => setExiting(true), 1800);
    const completeTimer = setTimeout(onLoadingComplete, 2200);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
      document.documentElement.style.removeProperty('background-color');
      document.body.style.removeProperty('background-color');
      void restoreAfterSplash();
    };
  }, [onLoadingComplete]);

  const splashLayerStyle: CSSProperties = {
    backgroundColor: RUCONNECT_SPLASH_BLUE,
  };

  return (
    <AnimatePresence>
      {!exiting ? (
        <motion.div
          key="splash"
          className="fixed inset-0 z-[100] flex flex-col overflow-hidden"
          style={splashLayerStyle}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.38, ease: [0.32, 0.72, 0, 1] }}
        >
          <div
            className="relative flex min-h-[100dvh] w-full min-w-0 flex-col items-center justify-center px-ios-4"
            style={{
              paddingTop: 'env(safe-area-inset-top, 0px)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              // Même bleu jusqu’aux bords (pas de dégradé = pas d’écart de teinte)
              backgroundColor: RUCONNECT_SPLASH_BLUE,
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                type: 'spring',
                stiffness: 280,
                damping: 28,
                mass: 0.9,
              }}
              className="flex flex-col items-center"
            >
              <img
                src={RUCONNECT_SPLASH_ICON_URL}
                alt=""
                draggable={false}
                className="relative select-none object-contain"
                style={{
                  width: 'min(42vw, 200px)',
                  height: 'min(42vw, 200px)',
                  maxWidth: 'min(88vw, 240px)',
                  maxHeight: 'min(88vw, 240px)',
                  minWidth: '120px',
                  minHeight: '120px',
                }}
              />
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.08,
                  type: 'spring',
                  stiffness: 320,
                  damping: 30,
                }}
                className="mt-ios-4 text-center font-semibold tracking-tight text-white"
                style={{
                  fontSize: 'clamp(1.35rem, 5vw, 1.75rem)',
                }}
              >
                Ruconnect
              </motion.p>
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
          transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
        />
      )}
    </AnimatePresence>
  );
};
