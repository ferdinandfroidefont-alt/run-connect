import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import splashImage from '@/assets/runconnect-splash-logo.png';

interface LoadingScreenProps {
  onLoadingComplete: () => void;
}

const BRAND_BLUE = '#2563EB';

export const LoadingScreen = ({ onLoadingComplete }: LoadingScreenProps) => {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    // Force blue everywhere for immersive splash
    const root = document.documentElement;
    const body = document.body;
    root.style.backgroundColor = BRAND_BLUE;
    body.style.backgroundColor = BRAND_BLUE;

    // Force meta theme-color for iOS status bar
    let metaTheme = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
    if (!metaTheme) {
      metaTheme = document.createElement('meta');
      metaTheme.name = 'theme-color';
      document.head.appendChild(metaTheme);
    }
    const previousThemeColor = metaTheme.content;
    metaTheme.content = BRAND_BLUE;

    const exitTimer = setTimeout(() => setExiting(true), 1800);
    const completeTimer = setTimeout(onLoadingComplete, 2200);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
      root.style.removeProperty('background-color');
      body.style.removeProperty('background-color');
      metaTheme.content = previousThemeColor || '#FFFFFF';
    };
  }, [onLoadingComplete]);

  return (
    <AnimatePresence>
      {!exiting ? (
        <motion.div
          key="splash"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
          style={{
            background: BRAND_BLUE,
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_55%)]" />

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 flex flex-col items-center px-ios-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0.7 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="h-28 w-28 rounded-[28px] bg-white/12 backdrop-blur-md border border-white/20 shadow-2xl flex items-center justify-center"
            >
              <img
                src={splashImage}
                alt="RunConnect"
                className="h-16 w-16 object-contain select-none"
                draggable={false}
              />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.08 }}
              className="mt-ios-4 text-white text-ios-title2 font-semibold tracking-tight"
            >
              RunConnect
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.92 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="mt-ios-1 text-white/90 text-ios-footnote"
            >
              Chargement de votre espace
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.22 }}
              className="mt-ios-6 flex items-center gap-ios-2"
            >
              {[0, 1, 2].map((dot) => (
                <motion.span
                  key={dot}
                  className="h-2 w-2 rounded-full bg-white/90"
                  animate={{ opacity: [0.35, 1, 0.35], y: [0, -2, 0] }}
                  transition={{
                    duration: 1.05,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: dot * 0.16,
                  }}
                />
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      ) : (
        <motion.div
          key="splash-exit"
          className="fixed inset-0 z-50"
          style={{ background: BRAND_BLUE }}
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
        />
      )}
    </AnimatePresence>
  );
};
