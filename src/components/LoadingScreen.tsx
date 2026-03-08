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

// Cursive "R" path — starts bottom-left (pin location), sweeps up, loops for the R bowl, diagonal leg
const R_PATH = "M 30,170 C 30,170 28,120 30,80 C 32,50 35,30 55,20 C 75,10 100,12 110,30 C 120,48 115,70 95,78 C 80,84 55,80 45,75 L 45,75 C 45,75 50,78 60,90 C 70,102 90,140 110,170";
const R_PATH_LENGTH = 520;

// Pin position = start of the R path
const PIN_X = 30;
const PIN_Y = 170;

export const LoadingScreen = ({ onLoadingComplete }: LoadingScreenProps) => {
  const [phase, setPhase] = useState<'pin' | 'trace' | 'glow' | 'loading'>('pin');
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
    const t1 = setTimeout(() => setPhase('trace'), 400);
    const t2 = setTimeout(() => setPhase('glow'), 1300);
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

  const showTrace = phase === 'trace' || phase === 'glow' || phase === 'loading';
  const isGlowing = phase === 'glow' || phase === 'loading';

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ background: '#FFFFFF' }}>

      {/* Main logo area */}
      <div className="flex flex-col items-center">
        <div className="relative" style={{ width: 140, height: 200 }}>

          {/* GPS Pin — always visible, appears first with spring */}
          <motion.svg
            className="absolute"
            style={{ left: PIN_X - 12, top: PIN_Y - 32 }}
            width="24"
            height="34"
            viewBox="0 0 24 34"
            fill="none"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.05 }}
          >
            <path
              d="M12 0C5.373 0 0 5.373 0 12c0 9 12 21 12 21s12-12 12-21C24 5.373 18.627 0 12 0z"
              fill="hsl(var(--primary))"
            />
            <circle cx="12" cy="11" r="4.5" fill="white" />
          </motion.svg>

          {/* Pulse ring around pin */}
          <AnimatePresence>
            {phase === 'pin' && (
              <motion.div
                className="absolute rounded-full"
                style={{
                  border: '2px solid hsl(var(--primary))',
                  width: 32,
                  height: 32,
                  left: PIN_X - 16,
                  top: PIN_Y - 28,
                }}
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: 2.8, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            )}
          </AnimatePresence>

          {/* R cursive trace — glow layer */}
          {showTrace && (
            <motion.svg
              className="absolute inset-0"
              width="140"
              height="200"
              viewBox="0 0 140 200"
              fill="none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              <defs>
                <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="hsl(var(--primary))" />
                  <stop offset="100%" stopColor="hsl(217 91% 68%)" />
                </linearGradient>
              </defs>

              {/* Glow layer */}
              <motion.path
                d={R_PATH}
                stroke="hsl(217 91% 68%)"
                strokeWidth={10}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                strokeDasharray={R_PATH_LENGTH}
                initial={{ strokeDashoffset: R_PATH_LENGTH }}
                animate={{ strokeDashoffset: 0 }}
                transition={{ duration: 0.85, delay: 0.05, ease: 'easeInOut' }}
                style={{ filter: 'blur(4px)' }}
              />

              {/* Main stroke */}
              <motion.path
                d={R_PATH}
                stroke="url(#blueGradient)"
                strokeWidth={5}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                strokeDasharray={R_PATH_LENGTH}
                initial={{ strokeDashoffset: R_PATH_LENGTH }}
                animate={{ strokeDashoffset: 0 }}
                transition={{ duration: 0.85, delay: 0.05, ease: 'easeInOut' }}
              />

              {/* Moving dot along path during trace */}
              {phase === 'trace' && (
                <motion.circle
                  r="4"
                  fill="hsl(var(--primary))"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 0.85, times: [0, 0.05, 0.85, 1] }}
                >
                  <animateMotion dur="0.85s" path={R_PATH} fill="freeze" />
                </motion.circle>
              )}
            </motion.svg>
          )}

          {/* Light sweep on glow phase */}
          {isGlowing && (
            <motion.div
              className="absolute inset-0 overflow-hidden pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <motion.div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.7) 50%, transparent 60%)',
                }}
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ delay: 0.15, duration: 0.5, ease: 'easeInOut' }}
              />
            </motion.div>
          )}
        </div>

        {/* App name */}
        <motion.h1
          className="text-primary text-[28px] font-bold tracking-[0.08em] mt-2 mb-8"
          initial={{ opacity: 0, y: 8 }}
          animate={showTrace ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
          transition={{ delay: 0.4, duration: 0.3 }}
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
                    background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(217 91% 68%))',
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
      </div>
    </div>
  );
};
