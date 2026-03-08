import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import runconnectLogo from '@/assets/runconnect-logo.png';

const loadingPhrases = [
  "Connexion aux coureurs…",
  "Chargement de la carte…",
  "Synchronisation des séances…",
];

interface LoadingScreenProps {
  onLoadingComplete: () => void;
}

export const LoadingScreen = ({ onLoadingComplete }: LoadingScreenProps) => {
  const [phase, setPhase] = useState<'pin' | 'trace' | 'logo' | 'loading'>('pin');
  const [progress, setProgress] = useState(0);
  const [currentPhrase, setCurrentPhrase] = useState(loadingPhrases[0]);
  const [phraseOpacity, setPhraseOpacity] = useState(1);

  // White background for iOS status bar
  useEffect(() => {
    document.documentElement.style.backgroundColor = '#FFFFFF';
    document.body.style.backgroundColor = '#FFFFFF';
    return () => {
      document.documentElement.style.removeProperty('background-color');
      document.body.style.removeProperty('background-color');
    };
  }, []);

  // Animation timeline
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('trace'), 400);
    const t2 = setTimeout(() => setPhase('logo'), 1200);
    const t3 = setTimeout(() => setPhase('loading'), 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  // Progress bar + phrases
  useEffect(() => {
    if (phase !== 'loading') return;

    let elapsed = 0;
    const duration = 1800;
    const interval = setInterval(() => {
      elapsed += 30;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(Math.round(eased * 100));
      if (t >= 1) clearInterval(interval);
    }, 30);

    let phraseIndex = 0;
    const phraseInterval = setInterval(() => {
      setPhraseOpacity(0);
      setTimeout(() => {
        phraseIndex = (phraseIndex + 1) % loadingPhrases.length;
        setCurrentPhrase(loadingPhrases[phraseIndex]);
        setPhraseOpacity(1);
      }, 150);
    }, 600);

    return () => { clearInterval(interval); clearInterval(phraseInterval); };
  }, [phase]);

  useEffect(() => {
    if (progress >= 100) {
      const timeout = setTimeout(onLoadingComplete, 250);
      return () => clearTimeout(timeout);
    }
  }, [progress, onLoadingComplete]);

  // SVG path for the "route" that morphs into the R shape
  const routePath = "M 30,80 C 30,40 30,25 50,25 C 70,25 70,40 70,50 C 70,60 60,65 50,65 L 30,65 M 50,65 L 72,85";
  const pathLength = 220;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ background: '#FFFFFF' }}>

      {/* --- Phase 1: GPS Pin --- */}
      <AnimatePresence>
        {phase === 'pin' && (
          <motion.div
            key="pin"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            className="absolute"
          >
            <svg width="48" height="64" viewBox="0 0 48 64" fill="none">
              <path
                d="M24 0C10.745 0 0 10.745 0 24c0 18 24 40 24 40s24-22 24-40C48 10.745 37.255 0 24 0z"
                fill="hsl(var(--primary))"
              />
              <circle cx="24" cy="22" r="9" fill="white" />
            </svg>
            {/* Pulse ring */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ border: '2px solid hsl(var(--primary))', borderRadius: '50%', width: 48, height: 48, top: 0, left: 0 }}
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 2.5, opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Phase 2: Route tracing the R shape --- */}
      <AnimatePresence>
        {phase === 'trace' && (
          <motion.div
            key="trace"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute"
          >
            <svg width="100" height="110" viewBox="0 0 100 110" fill="none">
              {/* Glow layer */}
              <motion.path
                d={routePath}
                stroke="hsl(var(--primary) / 0.3)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                strokeDasharray={pathLength}
                initial={{ strokeDashoffset: pathLength }}
                animate={{ strokeDashoffset: 0 }}
                transition={{ duration: 0.8, ease: 'easeInOut' }}
                style={{ filter: 'blur(4px)' }}
              />
              {/* Main line */}
              <motion.path
                d={routePath}
                stroke="hsl(var(--primary))"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                strokeDasharray={pathLength}
                initial={{ strokeDashoffset: pathLength }}
                animate={{ strokeDashoffset: 0 }}
                transition={{ duration: 0.8, ease: 'easeInOut' }}
              />
              {/* Moving dot at the end */}
              <motion.circle
                r="4"
                fill="hsl(var(--primary))"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 1, 0] }}
                transition={{ duration: 0.8, times: [0, 0.1, 0.8, 1] }}
              >
                <animateMotion
                  dur="0.8s"
                  path={routePath}
                  fill="freeze"
                />
              </motion.circle>
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Phase 3 & 4: Logo reveal + loading --- */}
      {(phase === 'logo' || phase === 'loading') && (
        <motion.div
          key="logo-section"
          className="flex flex-col items-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          {/* Logo with glow + light sweep */}
          <div className="relative mb-3">
            <motion.img
              src={runconnectLogo}
              alt="RunConnect"
              className="w-[100px] h-[100px] rounded-[24px] relative z-10"
              initial={{ filter: 'drop-shadow(0 0 0px hsl(var(--primary) / 0))' }}
              animate={{ filter: 'drop-shadow(0 0 20px hsl(var(--primary) / 0.35))' }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
            {/* Light sweep overlay */}
            <motion.div
              className="absolute inset-0 z-20 rounded-[24px] overflow-hidden pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <motion.div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.7) 50%, transparent 60%)',
                }}
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ delay: 0.4, duration: 0.6, ease: 'easeInOut' }}
              />
            </motion.div>
          </div>

          {/* App name */}
          <motion.h1
            className="text-primary text-[28px] font-bold tracking-[0.08em] mb-8"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            RUNCONNECT
          </motion.h1>

          {/* Loading bar section */}
          <AnimatePresence>
            {phase === 'loading' && (
              <motion.div
                className="w-[220px] flex flex-col items-center gap-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Progress bar */}
                <div className="w-full h-[4px] rounded-full bg-border overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))',
                      width: `${progress}%`,
                    }}
                    transition={{ duration: 0.05 }}
                  />
                </div>

                {/* Phrase */}
                <p
                  className="text-muted-foreground text-[13px] text-center transition-opacity duration-150"
                  style={{ opacity: phraseOpacity }}
                >
                  {currentPhrase}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
};
