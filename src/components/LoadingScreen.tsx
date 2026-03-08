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

// Clean stylized "R": vertical stem + rounded bowl + swooping athletic leg
const R_PATH =
  "M 55,195 L 55,30 " +                                    // vertical stem bottom-to-top
  "C 55,15 65,10 80,10 L 120,10 " +                        // top-left corner curve
  "C 150,10 165,25 165,50 " +                              // bowl top-right curve
  "C 165,75 150,90 120,90 L 55,90 " +                      // bowl bottom back to stem
  "M 100,90 C 115,105 140,140 170,195";                    // diagonal athletic leg
const R_PATH_LENGTH = 820;

// Pin at top of stem (route start)
const PIN_X = 55;
const PIN_Y = 10;

// SVG dimensions
const SVG_W = 200;
const SVG_H = 210;

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
        <div className="relative" style={{ width: SVG_W, height: SVG_H }}>

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
              fill="#0044CC"
            />
            <circle cx="12" cy="11" r="4.5" fill="white" />
          </motion.svg>

          {/* Pulse ring around pin */}
          <AnimatePresence>
            {phase === 'pin' && (
              <motion.div
                className="absolute rounded-full"
                style={{
                  border: '2px solid #0055EE',
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

          {/* R cursive trace — multi-layer */}
          {showTrace && (
            <motion.svg
              className="absolute inset-0"
              width={SVG_W}
              height={SVG_H}
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              fill="none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              <defs>
                <linearGradient id="rGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0033AA" />
                  <stop offset="50%" stopColor="#0066FF" />
                  <stop offset="100%" stopColor="#66AAFF" />
                </linearGradient>
                <linearGradient id="rHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.1)" />
                  <stop offset="50%" stopColor="rgba(180,220,255,0.6)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
                </linearGradient>
              </defs>

              {/* Layer 1: Wide soft glow */}
              <motion.path
                d={R_PATH}
                stroke="#4488FF"
                strokeWidth={14}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                strokeDasharray={R_PATH_LENGTH}
                initial={{ strokeDashoffset: R_PATH_LENGTH }}
                animate={{ strokeDashoffset: 0 }}
                transition={{ duration: 0.85, delay: 0.05, ease: 'easeInOut' }}
                style={{ filter: 'blur(6px)', opacity: 0.5 }}
              />

              {/* Layer 2: Main gradient stroke */}
              <motion.path
                d={R_PATH}
                stroke="url(#rGradient)"
                strokeWidth={7}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                strokeDasharray={R_PATH_LENGTH}
                initial={{ strokeDashoffset: R_PATH_LENGTH }}
                animate={{ strokeDashoffset: 0 }}
                transition={{ duration: 0.85, delay: 0.05, ease: 'easeInOut' }}
              />

              {/* Layer 3: Thin bright highlight (shine) */}
              <motion.path
                d={R_PATH}
                stroke="url(#rHighlight)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                strokeDasharray={R_PATH_LENGTH}
                initial={{ strokeDashoffset: R_PATH_LENGTH }}
                animate={{ strokeDashoffset: 0 }}
                transition={{ duration: 0.85, delay: 0.08, ease: 'easeInOut' }}
                style={{ opacity: 0.8 }}
              />

              {/* Moving dot along path during trace */}
              {phase === 'trace' && (
                <motion.circle
                  r="5"
                  fill="#3399FF"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 0.85, times: [0, 0.05, 0.85, 1] }}
                  style={{ filter: 'blur(1px)' }}
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
                  background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.8) 50%, transparent 65%)',
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
          className="text-[28px] font-bold tracking-[0.08em] mt-2 mb-8"
          style={{ color: '#0044CC' }}
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
                    background: 'linear-gradient(90deg, #0033AA, #0066FF, #66AAFF)',
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
