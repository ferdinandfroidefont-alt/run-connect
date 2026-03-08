import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const loadingPhrases = [
  "Connexion aux coureurs…",
  "Chargement de la carte…",
  "Synchronisation des séances…",
];

interface LoadingScreenProps {
  onLoadingComplete: () => void;
}

// RunConnect logo as SVG paths — rounded square + inner runner/route design
// The outer shape is a rounded rectangle, the inner is the route/runner mark
const OUTER_PATH = "M 24,2 L 76,2 Q 98,2 98,24 L 98,76 Q 98,98 76,98 L 24,98 Q 2,98 2,76 L 2,24 Q 2,2 24,2 Z";
const OUTER_LENGTH = 376;

// Inner design: stylised "R" route with runner silhouette curves
const INNER_PATH = "M 35,75 L 35,28 Q 35,22 41,22 L 58,22 Q 72,22 72,35 Q 72,48 58,48 L 45,48 L 68,78";
const INNER_LENGTH = 240;

export const LoadingScreen = ({ onLoadingComplete }: LoadingScreenProps) => {
  const [phase, setPhase] = useState<'pin' | 'trace' | 'fill' | 'loading'>('pin');
  const [progress, setProgress] = useState(0);
  const [currentPhrase, setCurrentPhrase] = useState(loadingPhrases[0]);
  const [phraseOpacity, setPhraseOpacity] = useState(1);

  // White background for status bar
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
    const t1 = setTimeout(() => setPhase('trace'), 350);
    const t2 = setTimeout(() => setPhase('fill'), 1200);
    const t3 = setTimeout(() => setPhase('loading'), 1600);
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

  const showLogo = phase === 'trace' || phase === 'fill' || phase === 'loading';
  const isFilled = phase === 'fill' || phase === 'loading';

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ background: '#FFFFFF' }}>

      {/* Phase 1: GPS Pin */}
      <AnimatePresence>
        {phase === 'pin' && (
          <motion.div
            key="pin"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.3, opacity: 0 }}
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
            <motion.div
              className="absolute rounded-full"
              style={{ border: '2px solid hsl(var(--primary))', width: 48, height: 48, top: 0, left: 0 }}
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 2.5, opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phase 2-4: Single continuous SVG logo — traced then filled */}
      {showLogo && (
        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <div className="relative mb-3">
            {/* The logo SVG — same element throughout, animation changes its appearance */}
            <motion.svg
              width="100"
              height="100"
              viewBox="0 0 100 100"
              fill="none"
              initial={{ filter: 'drop-shadow(0 0 0px hsl(var(--primary) / 0))' }}
              animate={isFilled
                ? { filter: 'drop-shadow(0 0 18px hsl(var(--primary) / 0.35))' }
                : { filter: 'drop-shadow(0 0 0px hsl(var(--primary) / 0))' }
              }
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              {/* Outer rounded square — glow layer */}
              <motion.path
                d={OUTER_PATH}
                stroke="hsl(var(--primary) / 0.2)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                strokeDasharray={OUTER_LENGTH}
                initial={{ strokeDashoffset: OUTER_LENGTH }}
                animate={{ strokeDashoffset: 0 }}
                transition={{ duration: 0.7, ease: 'easeInOut' }}
                style={{ filter: 'blur(3px)' }}
              />

              {/* Outer rounded square — main stroke */}
              <motion.path
                d={OUTER_PATH}
                stroke="hsl(var(--primary))"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={OUTER_LENGTH}
                initial={{ strokeDashoffset: OUTER_LENGTH, fillOpacity: 0 }}
                animate={isFilled
                  ? { strokeDashoffset: 0, fillOpacity: 1, strokeOpacity: 0 }
                  : { strokeDashoffset: 0, fillOpacity: 0, strokeOpacity: 1 }
                }
                transition={isFilled
                  ? { fillOpacity: { duration: 0.35 }, strokeOpacity: { duration: 0.35 }, strokeDashoffset: { duration: 0 } }
                  : { strokeDashoffset: { duration: 0.7, ease: 'easeInOut' } }
                }
                fill="hsl(var(--primary))"
              />

              {/* Inner route design — glow layer */}
              <motion.path
                d={INNER_PATH}
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                strokeDasharray={INNER_LENGTH}
                initial={{ strokeDashoffset: INNER_LENGTH }}
                animate={{ strokeDashoffset: 0 }}
                transition={{ duration: 0.5, delay: 0.35, ease: 'easeInOut' }}
                style={{ filter: 'blur(2px)' }}
              />

              {/* Inner route design — main stroke */}
              <motion.path
                d={INNER_PATH}
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                strokeDasharray={INNER_LENGTH}
                initial={{ strokeDashoffset: INNER_LENGTH }}
                animate={{ strokeDashoffset: 0 }}
                transition={{ duration: 0.5, delay: 0.35, ease: 'easeInOut' }}
              />

              {/* Moving dot along outer path */}
              {phase === 'trace' && (
                <motion.circle
                  r="3"
                  fill="hsl(var(--primary))"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 0.7, times: [0, 0.05, 0.85, 1] }}
                >
                  <animateMotion dur="0.7s" path={OUTER_PATH} fill="freeze" />
                </motion.circle>
              )}
            </motion.svg>

            {/* Light sweep overlay — only when filled */}
            {isFilled && (
              <motion.div
                className="absolute inset-0 z-20 rounded-[22px] overflow-hidden pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
              >
                <motion.div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.6) 50%, transparent 60%)',
                  }}
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ delay: 0.2, duration: 0.5, ease: 'easeInOut' }}
                />
              </motion.div>
            )}
          </div>

          {/* App name */}
          <motion.h1
            className="text-primary text-[28px] font-bold tracking-[0.08em] mb-8"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
          >
            RUNCONNECT
          </motion.h1>

          {/* Loading bar */}
          <AnimatePresence>
            {phase === 'loading' && (
              <motion.div
                className="w-[220px] flex flex-col items-center gap-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
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
