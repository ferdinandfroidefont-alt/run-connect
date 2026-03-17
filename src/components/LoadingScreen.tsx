import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import appIcon from '@/assets/app-icon.png';

interface LoadingScreenProps {
  onLoadingComplete: () => void;
}

const TOTAL_DURATION = 1700;

export const LoadingScreen = ({ onLoadingComplete }: LoadingScreenProps) => {
  const [exit, setExit] = useState(false);

  useEffect(() => {
    document.documentElement.style.backgroundColor = '#FFFFFF';
    document.body.style.backgroundColor = '#FFFFFF';
    return () => {
      document.documentElement.style.removeProperty('background-color');
      document.body.style.removeProperty('background-color');
    };
  }, []);

  useEffect(() => {
    const t1 = setTimeout(() => setExit(true), TOTAL_DURATION - 200);
    const t2 = setTimeout(onLoadingComplete, TOTAL_DURATION);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onLoadingComplete]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center"
        style={{ background: '#FFFFFF' }}
        animate={exit ? { opacity: 0 } : { opacity: 1 }}
        transition={{ duration: 0.2, ease: 'easeIn' }}
      >
        <motion.img
          src={appIcon}
          alt="RunConnect"
          className="select-none"
          style={{ width: 170, height: 170, objectFit: 'contain' }}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />

        <motion.h1
          className="text-[28px] font-extrabold tracking-[0.14em] mt-3 select-none"
          style={{
            background: 'linear-gradient(135deg, #1244d4 0%, #2072f7 40%, #67abf8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2, ease: 'easeOut' }}
        >
          RUNCONNECT
        </motion.h1>
      </motion.div>
    </AnimatePresence>
  );
};
