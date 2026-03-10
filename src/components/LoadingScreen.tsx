import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const loadingPhrases = [
  "Connexion aux coureurs…",
  "Chargement de la carte…",
  "Synchronisation des séances…",
];

interface LoadingScreenProps {
  onLoadingComplete: () => void;
}

const R_PATH =
  "M 55,195 L 55,30 " +
  "C 55,15 65,10 80,10 L 120,10 " +
  "C 150,10 165,25 165,50 " +
  "C 165,75 150,90 120,90 L 55,90 " +
  "M 100,90 C 115,105 140,140 170,195";

const SVG_W = 200;
const SVG_H = 210;
const TRACE_DURATION = 2;
const PIN_DROP_DELAY = 400; // ms

// Start point of the path
const START_X = 55;
const START_Y = 195;

export const LoadingScreen = ({ onLoadingComplete }: LoadingScreenProps) => {
  const [phase, setPhase] = useState<'pin-drop' | 'trace' | 'complete' | 'loading'>('pin-drop');
  const [progress, setProgress] = useState(0);
  const [currentPhrase, setCurrentPhrase] = useState(loadingPhrases[0]);
  const [phraseOpacity, setPhraseOpacity] = useState(1);

  // Pin position & trace offset driven by rAF
  const [pinPos, setPinPos] = useState({ x: START_X, y: START_Y });
  const [traceOffset, setTraceOffset] = useState(1); // 1 = fully hidden, 0 = fully drawn
  const [totalLength, setTotalLength] = useState(820);

  const pathRef = useRef<SVGPathElement>(null);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  // White background for status bar
  useEffect(() => {
    document.documentElement.style.backgroundColor = '#FFFFFF';
    document.body.style.backgroundColor = '#FFFFFF';
    return () => {
      document.documentElement.style.removeProperty('background-color');
      document.body.style.removeProperty('background-color');
    };
  }, []);

  // Measure real path length
  useEffect(() => {
    if (pathRef.current) {
      setTotalLength(pathRef.current.getTotalLength());
    }
  }, []);

  // rAF animation loop for the trace phase
  const animateTrace = useCallback((timestamp: number) => {
    if (!startTimeRef.current) startTimeRef.current = timestamp;
    const elapsed = (timestamp - startTimeRef.current) / 1000;
    const t = Math.min(elapsed / TRACE_DURATION, 1);

    // Slight easeInOut for natural feel
    const eased = t < 0.5
      ? 2 * t * t
      : 1 - Math.pow(-2 * t + 2, 2) / 2;

    if (pathRef.current) {
      const len = pathRef.current.getTotalLength();
      const point = pathRef.current.getPointAtLength(eased * len);
      setPinPos({ x: point.x, y: point.y });
      setTraceOffset(1 - eased);
    }

    if (t < 1) {
      rafRef.current = requestAnimationFrame(animateTrace);
    }
  }, []);

  // Phase timeline
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('trace'), PIN_DROP_DELAY);
    const t2 = setTimeout(() => setPhase('complete'), PIN_DROP_DELAY + TRACE_DURATION * 1000 + 100);
    const t3 = setTimeout(() => setPhase('loading'), PIN_DROP_DELAY + TRACE_DURATION * 1000 + 400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  // Start rAF when trace phase begins
  useEffect(() => {
    if (phase === 'trace') {
      startTimeRef.current = 0;
      rafRef.current = requestAnimationFrame(animateTrace);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase, animateTrace]);

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

  const isTracing = phase === 'trace';
  const showTrace = phase !== 'pin-drop';
  const isComplete = phase === 'complete' || phase === 'loading';

  const dashOffset = traceOffset * totalLength;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ background: '#FFFFFF' }}>
      <div className="flex flex-col items-center">
        <div className="relative" style={{ width: SVG_W, height: SVG_H }}>
          <svg
            width={SVG_W}
            height={SVG_H}
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            fill="none"
            style={{ overflow: 'visible' }}
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
              <filter id="glow">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Hidden measurement path */}
            <path
              ref={pathRef}
              d={R_PATH}
              fill="none"
              stroke="none"
            />

            {/* Layer 1: Wide soft glow behind the trace */}
            {showTrace && (
              <path
                d={R_PATH}
                stroke="#4488FF"
                strokeWidth={14}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                strokeDasharray={totalLength}
                strokeDashoffset={dashOffset}
                style={{ filter: 'blur(6px)', opacity: 0.5 }}
              />
            )}

            {/* Layer 2: Main gradient stroke */}
            {showTrace && (
              <path
                d={R_PATH}
                stroke="url(#rGradient)"
                strokeWidth={7}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                strokeDasharray={totalLength}
                strokeDashoffset={dashOffset}
              />
            )}

            {/* Layer 3: Thin bright highlight */}
            {showTrace && (
              <path
                d={R_PATH}
                stroke="url(#rHighlight)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                strokeDasharray={totalLength}
                strokeDashoffset={dashOffset}
                style={{ opacity: 0.8 }}
              />
            )}

            {/* GPS Halo pulse at pin position */}
            {(isTracing || phase === 'pin-drop') && (
              <>
                <circle
                  cx={pinPos.x}
                  cy={pinPos.y}
                  r="6"
                  fill="none"
                  stroke="#0055EE"
                  strokeWidth="2"
                  opacity="0.4"
                >
                  <animate attributeName="r" values="6;18;6" dur="1s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.5;0;0.5" dur="1s" repeatCount="indefinite" />
                </circle>
                <circle
                  cx={pinPos.x}
                  cy={pinPos.y}
                  r="6"
                  fill="none"
                  stroke="#0055EE"
                  strokeWidth="1.5"
                  opacity="0.3"
                >
                  <animate attributeName="r" values="6;24;6" dur="1.4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.3;0;0.3" dur="1.4s" repeatCount="indefinite" />
                </circle>
              </>
            )}

            {/* The GPS Pin — positioned at pinPos, CREATING the trace */}
            {phase === 'pin-drop' ? (
              <g transform={`translate(${START_X}, ${START_Y})`}>
                <motion.g
                  initial={{ scale: 0, y: -20 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.05 }}
                >
                  <g transform="translate(-12, -32)">
                    <path
                      d="M12 0C5.373 0 0 5.373 0 12c0 9 12 21 12 21s12-12 12-21C24 5.373 18.627 0 12 0z"
                      fill="#0044CC"
                      filter="url(#glow)"
                    />
                    <circle cx="12" cy="11" r="4.5" fill="white" />
                  </g>
                </motion.g>
              </g>
            ) : (
              <g transform={`translate(${pinPos.x - 12}, ${pinPos.y - 32})`}>
                <path
                  d="M12 0C5.373 0 0 5.373 0 12c0 9 12 21 12 21s12-12 12-21C24 5.373 18.627 0 12 0z"
                  fill="#0044CC"
                  filter="url(#glow)"
                />
                <circle cx="12" cy="11" r="4.5" fill="white" />
              </g>
            )}
          </svg>

          {/* Light sweep on complete */}
          {isComplete && (
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
          animate={isComplete ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
          transition={{ delay: 0.2, duration: 0.3 }}
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
