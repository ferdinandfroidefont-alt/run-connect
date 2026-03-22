import { useState, useEffect, type CSSProperties } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import splashImage from '@/assets/runconnect-splash-logo.png';
import {
  applyIosStatusBarForTheme,
  applyWebChromeForTheme,
  getPreferredDarkFromStorage,
} from '@/lib/iosStatusBarTheme';

interface LoadingScreenProps {
  onLoadingComplete: () => void;
}

/** Bleu uni — même teinte partout (splash, status bar, safe areas) */
const BRAND_BLUE = '#2563EB';

export const LoadingScreen = ({ onLoadingComplete }: LoadingScreenProps) => {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    root.style.backgroundColor = BRAND_BLUE;
    body.style.backgroundColor = BRAND_BLUE;

    let metaTheme = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
    if (!metaTheme) {
      metaTheme = document.createElement('meta');
      metaTheme.name = 'theme-color';
      document.head.appendChild(metaTheme);
    }
    metaTheme.content = BRAND_BLUE;

    let metaApple = document.querySelector(
      'meta[name="apple-mobile-web-app-status-bar-style"]'
    ) as HTMLMetaElement | null;
    if (!metaApple) {
      metaApple = document.createElement('meta');
      metaApple.name = 'apple-mobile-web-app-status-bar-style';
      document.head.appendChild(metaApple);
    }
    metaApple.setAttribute('content', 'black-translucent');

    let afterSplashApplied = false;
    const applyNativeStatusBarForSplash = async () => {
      if (!Capacitor.isNativePlatform()) return;
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setOverlaysWebView({ overlay: true });
        await StatusBar.setStyle({ style: Style.Dark });
        try {
          await StatusBar.setBackgroundColor({ color: BRAND_BLUE });
        } catch {
          /* iOS peut ignorer setBackgroundColor ; overlay + fond bleu suffit */
        }
      } catch (e) {
        console.warn('[LoadingScreen] StatusBar splash:', e);
      }
    };

    const restoreAfterSplash = async () => {
      if (afterSplashApplied) return;
      afterSplashApplied = true;
      const isDark = getPreferredDarkFromStorage();
      applyWebChromeForTheme(isDark);
      try {
        if (Capacitor.isNativePlatform()) {
          await applyIosStatusBarForTheme(isDark);
        }
      } catch (e) {
        console.warn('[LoadingScreen] post-splash chrome:', e);
      }
    };

    void applyNativeStatusBarForSplash();

    const exitTimer = setTimeout(() => setExiting(true), 1800);
    const completeTimer = setTimeout(onLoadingComplete, 2200);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
      root.style.removeProperty('background-color');
      body.style.removeProperty('background-color');
      void restoreAfterSplash();
    };
  }, [onLoadingComplete]);

  const splashLayerStyle: CSSProperties = {
    backgroundColor: BRAND_BLUE,
  };

  return (
    <AnimatePresence>
      {!exiting ? (
        <motion.div
          key="splash"
          className="fixed inset-0 z-[100] flex flex-col overflow-hidden"
          style={splashLayerStyle}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.42, ease: [0.32, 0.72, 0, 1] }}
        >
          {/* Base + halo type iOS (lisible sous status bar overlay) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ backgroundColor: BRAND_BLUE }}
            aria-hidden
          />
          <div
            className="absolute inset-0 pointer-events-none opacity-100"
            style={{
              background: `radial-gradient(ellipse 85% 55% at 50% 38%, rgba(255,255,255,0.22) 0%, transparent 52%),
                radial-gradient(ellipse 120% 80% at 50% 100%, rgba(0,0,0,0.12) 0%, transparent 45%),
                linear-gradient(165deg, #3b82f6 0%, ${BRAND_BLUE} 42%, #1e40af 100%)`,
            }}
            aria-hidden
          />

          <div
            className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center px-ios-4"
            style={{
              paddingTop: 'env(safe-area-inset-top, 0px)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, filter: 'blur(8px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              transition={{
                type: 'spring',
                stiffness: 260,
                damping: 26,
                mass: 0.85,
              }}
              className="flex flex-col items-center"
            >
              <div className="relative">
                <div
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[2.5rem] blur-3xl opacity-70 pointer-events-none"
                  style={{
                    width: 'min(72vw, 320px)',
                    height: 'min(72vw, 320px)',
                    background: 'radial-gradient(circle, rgba(255,255,255,0.45) 0%, transparent 68%)',
                  }}
                  aria-hidden
                />
                <img
                  src={splashImage}
                  alt=""
                  draggable={false}
                  className="relative select-none object-contain drop-shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
                  style={{
                    width: '30vh',
                    height: '30vh',
                    maxWidth: 'min(92vw, 280px)',
                    maxHeight: 'min(92vw, 280px)',
                    minWidth: '120px',
                    minHeight: '120px',
                  }}
                />
              </div>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.12,
                  type: 'spring',
                  stiffness: 320,
                  damping: 28,
                }}
                className="mt-ios-3 text-center font-semibold uppercase text-white/95 ios-tracking-tight"
                style={{
                  fontSize: 'clamp(0.72rem, 2.9vw, 0.88rem)',
                  letterSpacing: '0.24em',
                }}
              >
                RUNCONNECT
              </motion.p>
            </motion.div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="splash-exit"
          className="fixed inset-0 z-[100]"
          style={{ backgroundColor: BRAND_BLUE }}
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
        />
      )}
    </AnimatePresence>
  );
};
