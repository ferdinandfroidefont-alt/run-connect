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
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="relative z-10 flex items-center justify-center"
          >
            <img
              src={splashImage}
              alt="RunConnect"
              draggable={false}
              className="select-none object-contain"
              style={{
                width: '20vh',
                height: '20vh',
                maxWidth: '220px',
                maxHeight: '220px',
                minWidth: '120px',
                minHeight: '120px',
                filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.08))',
              }}
            />
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
