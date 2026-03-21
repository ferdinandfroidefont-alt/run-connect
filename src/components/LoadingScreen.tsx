import { useState, useEffect, type CSSProperties } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import splashImage from '@/assets/runconnect-splash-logo.png';

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
    const previousThemeColor = metaTheme.content;
    metaTheme.content = BRAND_BLUE;

    let metaApple = document.querySelector(
      'meta[name="apple-mobile-web-app-status-bar-style"]'
    ) as HTMLMetaElement | null;
    const previousApple = metaApple?.content ?? '';
    if (!metaApple) {
      metaApple = document.createElement('meta');
      metaApple.name = 'apple-mobile-web-app-status-bar-style';
      document.head.appendChild(metaApple);
    }
    metaApple.setAttribute('content', 'black-translucent');

    let statusBarRestored = false;
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

    const restoreNativeStatusBar = async () => {
      if (!Capacitor.isNativePlatform() || statusBarRestored) return;
      statusBarRestored = true;
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setOverlaysWebView({ overlay: false });
        await StatusBar.setStyle({ style: Style.Light });
        try {
          await StatusBar.setBackgroundColor({ color: '#FFFFFF' });
        } catch {
          /* ignore */
        }
      } catch (e) {
        console.warn('[LoadingScreen] StatusBar restore:', e);
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
      metaTheme.content = previousThemeColor || '#FFFFFF';
      if (previousApple) {
        metaApple!.setAttribute('content', previousApple);
      } else {
        metaApple!.setAttribute('content', 'default');
      }
      void restoreNativeStatusBar();
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
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          {/* Fond 100 % uni sur toute la surface (y compris sous status bar en mode overlay) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ backgroundColor: BRAND_BLUE }}
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
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center"
            >
              <img
                src={splashImage}
                alt=""
                draggable={false}
                className="select-none object-contain"
                style={{
                  width: '30vh',
                  height: '30vh',
                  maxWidth: 'min(92vw, 280px)',
                  maxHeight: 'min(92vw, 280px)',
                  minWidth: '120px',
                  minHeight: '120px',
                }}
              />
              <p
                className="mt-ios-3 text-center font-bold uppercase tracking-[0.2em] text-white"
                style={{
                  fontSize: 'clamp(0.7rem, 2.8vw, 0.85rem)',
                  letterSpacing: '0.22em',
                }}
              >
                RUNCONNECT
              </p>
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
          transition={{ duration: 0.35, ease: 'easeOut' }}
        />
      )}
    </AnimatePresence>
  );
};
