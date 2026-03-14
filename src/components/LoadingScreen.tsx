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

// Swoopy R path — inspired by the app icon shape
// Starts bottom-left (pin location), goes up, swoops right for the R curve, leg swoops down-right
const R_PATH =
  "M 65,175 L 65,65 " +                          // vertical stroke up
  "C 65,35 85,20 115,20 " +                       // top-left curve
  "L 145,20 " +                                    // top horizontal
  "C 185,20 205,42 200,72 " +                     // R bump top
  "C 195,98 170,108 140,105 " +                   // R bump bottom curve back
  "L 95,105 " +                                    // back to spine
  "M 120,105 C 145,130 175,160 210,178";           // leg swooping down-right

const SVG_W = 260;
const SVG_H = 200;

// Pin shape as SVG path (teardrop GPS marker) — used for the final integrated pin
const PIN_PATH = "M0-28C-8.5-28-15.5-21-15.5-12.5C-15.5-3 0 12 0 12S15.5-3 15.5-12.5C15.5-21 8.5-28 0-28Z";
const TRACE_DURATION = 1.8;
const PIN_DROP_DELAY = 500;

const START_X = 65;
const START_Y = 175;

export const LoadingScreen = ({ onLoadingComplete }: LoadingScreenProps) => {
  const [phase, setPhase] = useState<'pin-drop' | 'trace' | 'complete' | 'loading'>('pin-drop');
  const [progress, setProgress] = useState(0);
  const [currentPhrase, setCurrentPhrase] = useState(loadingPhrases[0]);
  const [phraseOpacity, setPhraseOpacity] = useState(1);

  const [pinPos, setPinPos] = useState({ x: START_X, y: START_Y });
  const [traceOffset, setTraceOffset] = useState(1);
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

    // easeInOut
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
    const t2 = setTimeout(() => setPhase('complete'), PIN_DROP_DELAY + TRACE_DURATION * 1000 + 150);
    const t3 = setTimeout(() => setPhase('loading'), PIN_DROP_DELAY + TRACE_DURATION * 1000 + 600);
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
    const duration = 1600;
    const interval = setInterval(() => {
      elapsed += 20;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(Math.round(eased * 100));
      if (t >= 1) clearInterval(interval);
    }, 20);

    let phraseIndex = 0;
    const phraseInterval = setInterval(() => {
      setPhraseOpacity(0);
      setTimeout(() => {
        phraseIndex = (phraseIndex + 1) % loadingPhrases.length;
        setCurrentPhrase(loadingPhrases[phraseIndex]);
        setPhraseOpacity(1);
      }, 150);
    }, 550);

    return () => { clearInterval(interval); clearInterval(phraseInterval); };
  }, [phase]);

  useEffect(() => {
    if (progress >= 100) {
      const timeout = setTimeout(onLoadingComplete, 200);
      return () => clearTimeout(timeout);
    }
  }, [progress, onLoadingComplete]);

  const isTracing = phase === 'trace';
  const showTrace = phase !== 'pin-drop';
  const isComplete = phase === 'complete' || phase === 'loading';
  const dashOffset = traceOffset * totalLength;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: '#FFFFFF' }}
    >
      {/* Subtle radial ambient glow behind logo */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 340,
          height: 340,
          background: 'radial-gradient(circle, rgba(0,80,255,0.06) 0%, transparent 70%)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -60%)',
        }}
      />

      <div className="flex flex-col items-center relative">
        {/* Main SVG — larger and centered */}
        <div className="relative" style={{ width: SVG_W, height: SVG_H }}>
          <svg
            width={SVG_W}
            height={SVG_H}
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            fill="none"
            style={{ overflow: 'visible' }}
          >
            <defs>
              <linearGradient id="rGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#002B99" />
                <stop offset="50%" stopColor="#0055EE" />
                <stop offset="100%" stopColor="#3399FF" />
              </linearGradient>
              <linearGradient id="rGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0044CC" />
                <stop offset="100%" stopColor="#66BBFF" />
              </linearGradient>
              <linearGradient id="rHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
                <stop offset="50%" stopColor="rgba(200,230,255,0.5)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
              </linearGradient>
              <filter id="traceGlow">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="pinShadow">
                <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#0044CC" floodOpacity="0.35" />
              </filter>
              <filter id="pinGlow">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Measurement path (invisible) */}
            <path ref={pathRef} d={R_PATH} fill="none" stroke="none" />

            {/* Layer 0: Very soft wide trace glow */}
            {showTrace && (
              <path
                d={R_PATH}
                stroke="#3388FF"
                strokeWidth={18}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                strokeDasharray={totalLength}
                strokeDashoffset={dashOffset}
                style={{ filter: 'blur(10px)', opacity: 0.25 }}
              />
            )}

            {/* Layer 1: Medium glow */}
            {showTrace && (
              <path
                d={R_PATH}
                stroke="url(#rGlow)"
                strokeWidth={12}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                strokeDasharray={totalLength}
                strokeDashoffset={dashOffset}
                style={{ filter: 'blur(4px)', opacity: 0.45 }}
              />
            )}

            {/* Layer 2: Main solid trace */}
            {showTrace && (
              <path
                d={R_PATH}
                stroke="url(#rGrad)"
                strokeWidth={6}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                strokeDasharray={totalLength}
                strokeDashoffset={dashOffset}
              />
            )}

            {/* Layer 3: Inner bright highlight */}
            {showTrace && (
              <path
                d={R_PATH}
                stroke="url(#rHighlight)"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                strokeDasharray={totalLength}
                strokeDashoffset={dashOffset}
                style={{ opacity: 0.7 }}
              />
            )}

            {/* GPS Pulse rings */}
            {(isTracing || phase === 'pin-drop') && (
              <>
                <circle cx={pinPos.x} cy={pinPos.y} r="8" fill="none" stroke="#0066FF" strokeWidth="2" opacity="0.35">
                  <animate attributeName="r" values="8;22;8" dur="1.2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.4;0;0.4" dur="1.2s" repeatCount="indefinite" />
                </circle>
                <circle cx={pinPos.x} cy={pinPos.y} r="8" fill="none" stroke="#0066FF" strokeWidth="1.2" opacity="0.2">
                  <animate attributeName="r" values="8;32;8" dur="1.6s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.25;0;0.25" dur="1.6s" repeatCount="indefinite" />
                </circle>
                {/* Small solid core dot at pin base */}
                <circle cx={pinPos.x} cy={pinPos.y} r="3" fill="#0055EE" opacity="0.6">
                  <animate attributeName="opacity" values="0.6;0.3;0.6" dur="0.8s" repeatCount="indefinite" />
                </circle>
              </>
            )}

            {/* GPS Pin */}
            {phase === 'pin-drop' ? (
              <g transform={`translate(${START_X}, ${START_Y})`}>
                <motion.g
                  initial={{ scale: 0, y: -40 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 14, delay: 0.08 }}
                >
                  <g transform="translate(-14, -38)" filter="url(#pinShadow)">
                    <path
                      d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 24.5 14 24.5S28 24.5 28 14C28 6.268 21.732 0 14 0z"
                      fill="#0044CC"
                    />
                    <path
                      d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 24.5 14 24.5S28 24.5 28 14C28 6.268 21.732 0 14 0z"
                      fill="url(#rGrad)"
                      opacity="0.6"
                    />
                    <circle cx="14" cy="13" r="5.5" fill="white" />
                    <circle cx="14" cy="13" r="2.5" fill="#0055EE" opacity="0.7" />
                  </g>
                </motion.g>
              </g>
            ) : !isComplete ? (
              <g transform={`translate(${pinPos.x - 14}, ${pinPos.y - 38})`} filter="url(#pinGlow)">
                <path
                  d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 24.5 14 24.5S28 24.5 28 14C28 6.268 21.732 0 14 0z"
                  fill="#0044CC"
                />
                <path
                  d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 24.5 14 24.5S28 24.5 28 14C28 6.268 21.732 0 14 0z"
                  fill="url(#rGrad)"
                  opacity="0.6"
                />
                <circle cx="14" cy="13" r="5.5" fill="white" />
                <circle cx="14" cy="13" r="2.5" fill="#0055EE" opacity="0.7" />
              </g>
            ) : null}
          </svg>

          {/* Light sweep shimmer on complete */}
          {isComplete && (
            <motion.div
              className="absolute inset-0 overflow-hidden pointer-events-none rounded-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.05 }}
            >
              <motion.div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.85) 50%, transparent 70%)',
                }}
                initial={{ x: '-120%' }}
                animate={{ x: '120%' }}
                transition={{ delay: 0.1, duration: 0.55, ease: 'easeInOut' }}
              />
            </motion.div>
          )}
        </div>

        {/* App name — appears after trace completes */}
        <motion.h1
          className="text-[30px] font-extrabold tracking-[0.12em] mt-1 select-none"
          style={{
            background: 'linear-gradient(135deg, #002B99 0%, #0055EE 50%, #3399FF 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
          initial={{ opacity: 0, y: 12, scale: 0.95 }}
          animate={isComplete ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 12, scale: 0.95 }}
          transition={{ delay: 0.15, duration: 0.35, ease: 'easeOut' }}
        >
          RUNCONNECT
        </motion.h1>

        {/* Loading bar + phrases */}
        <AnimatePresence>
          {phase === 'loading' && (
            <motion.div
              className="w-[240px] flex flex-col items-center gap-3 mt-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="w-full h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(0,60,180,0.08)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, #002B99, #0055EE, #3399FF)',
                    width: `${progress}%`,
                  }}
                  transition={{ duration: 0.05 }}
                />
              </div>
              <p
                className="text-[13px] text-center transition-opacity duration-150 select-none"
                style={{ opacity: phraseOpacity, color: '#6B7280' }}
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
