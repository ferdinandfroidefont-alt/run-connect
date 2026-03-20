import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import runconnectIcon from '@/assets/runconnect-icon.png';

interface LoadingScreenProps {
  onLoadingComplete: () => void;
}

const BRAND_BLUE = '#2563EB';

export const LoadingScreen = ({ onLoadingComplete }: LoadingScreenProps) => {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    document.documentElement.style.backgroundColor = BRAND_BLUE;
    document.body.style.backgroundColor = BRAND_BLUE;

    const exitTimer = setTimeout(() => setExiting(true), 1800);
    const completeTimer = setTimeout(onLoadingComplete, 2200);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
      document.documentElement.style.removeProperty('background-color');
      document.body.style.removeProperty('background-color');
    };
  }, [onLoadingComplete]);

  return (
    <AnimatePresence>
      {!exiting ? (
        <motion.div
          key="splash"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          style={{
            background: BRAND_BLUE,
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
        >
          {/* Icon with blend mode to show only white symbol */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <img
              src={runconnectIcon}
              alt="RunConnect"
              style={{
                width: 140,
                height: 140,
                mixBlendMode: 'lighten',
                borderRadius: 30,
              }}
              draggable={false}
            />
          </motion.div>

          {/* App name */}
          <motion.h1
            className="text-[22px] font-bold tracking-[0.18em] mt-6 select-none"
            style={{ color: 'rgba(255,255,255,0.95)' }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease: 'easeOut' }}
          >
            RUNCONNECT
          </motion.h1>
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