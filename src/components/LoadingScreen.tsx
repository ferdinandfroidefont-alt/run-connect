import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoadingScreenProps {
  onLoadingComplete: () => void;
}

// Swoopy R path — single continuous fluid curve matching the official logo
// Like a winding road: pin(bottom-left) → up → swoops LEFT at top → curves back RIGHT → leg down-right
const R_PATH =
  "M 62,185 " +                                    // start at GPS pin
  "C 58,155 52,125 50,95 " +                       // stem going up, slight left lean
  "C 48,65 55,35 85,22 " +                         // curves toward top-left
  "C 115,9 160,8 195,25 " +                        // wide swoop across top to the RIGHT
  "C 220,38 225,65 205,82 " +                      // R bump curves down
  "C 185,100 155,108 125,100 " +                   // bump returns left smoothly
  "C 145,115 170,145 205,182";                      // leg flows down-right seamlessly

const SVG_W = 260;
const SVG_H = 210;

const APPEAR_DELAY = 200;
const TRACE_DURATION = 1.0; // seconds
const REVEAL_DELAY = 1200;  // ms from start
const EXIT_DELAY = 1500;    // ms from start
const TOTAL_DURATION = 1700;

const START_X = 60;
const START_Y = 180;

// Pin SVG path (teardrop)
const PIN_PATH = "M0-28C-8.5-28-15.5-21-15.5-12.5C-15.5-3 0 12 0 12S15.5-3 15.5-12.5C15.5-21 8.5-28 0-28Z";

export const LoadingScreen = ({ onLoadingComplete }: LoadingScreenProps) => {
  const [phase, setPhase] = useState<'appear' | 'trace' | 'reveal' | 'exit'>('appear');
  const [traceProgress, setTraceProgress] = useState(0); // 0-1
  const [dotPos, setDotPos] = useState({ x: START_X, y: START_Y });
  const [totalLength, setTotalLength] = useState(800);

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

  // Measure path
  useEffect(() => {
    if (pathRef.current) {
      setTotalLength(pathRef.current.getTotalLength());
    }
  }, []);

  // rAF trace animation
  const animateTrace = useCallback((timestamp: number) => {
    if (!startTimeRef.current) startTimeRef.current = timestamp;
    const elapsed = (timestamp - startTimeRef.current) / 1000;
    const t = Math.min(elapsed / TRACE_DURATION, 1);

    // easeInOut cubic
    const eased = t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;

    setTraceProgress(eased);

    if (pathRef.current) {
      const point = pathRef.current.getPointAtLength(eased * totalLength);
      setDotPos({ x: point.x, y: point.y });
    }

    if (t < 1) {
      rafRef.current = requestAnimationFrame(animateTrace);
    }
  }, [totalLength]);

  // Phase timeline
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('trace'), APPEAR_DELAY);
    const t2 = setTimeout(() => setPhase('reveal'), REVEAL_DELAY);
    const t3 = setTimeout(() => setPhase('exit'), EXIT_DELAY);
    const t4 = setTimeout(onLoadingComplete, TOTAL_DURATION);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onLoadingComplete]);

  // Start trace animation
  useEffect(() => {
    if (phase === 'trace') {
      startTimeRef.current = 0;
      rafRef.current = requestAnimationFrame(animateTrace);
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [phase, animateTrace]);

  const isTracing = phase === 'trace';
  const isRevealed = phase === 'reveal' || phase === 'exit';
  const isExit = phase === 'exit';
  const dashOffset = (1 - traceProgress) * totalLength;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
        style={{ background: '#FFFFFF' }}
        animate={isExit ? { opacity: 0, y: -20 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeIn' }}
      >
        {/* Subtle ambient glow */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 300, height: 300,
            background: 'radial-gradient(circle, rgba(0,68,204,0.06) 0%, transparent 70%)',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -55%)',
          }}
        />

        <div className="flex flex-col items-center relative">
          <div className="relative" style={{ width: SVG_W, height: SVG_H }}>
            <svg
              width={SVG_W} height={SVG_H}
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              fill="none"
              style={{ overflow: 'visible' }}
            >
              <defs>
                <linearGradient id="rGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0044CC" />
                  <stop offset="50%" stopColor="#0088FF" />
                  <stop offset="100%" stopColor="#33BBFF" />
                </linearGradient>
                <linearGradient id="rGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0066EE" />
                  <stop offset="100%" stopColor="#55CCFF" />
                </linearGradient>
                <linearGradient id="shimmer" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                  <stop offset="50%" stopColor="rgba(200,235,255,0.6)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </linearGradient>
                <filter id="dotGlow">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="trailGlow">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="pinShadow">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0044CC" floodOpacity="0.3" />
                </filter>
              </defs>

              {/* Hidden measurement path */}
              <path ref={pathRef} d={R_PATH} fill="none" stroke="none" />

              {/* Layer 1: Wide soft glow trail */}
              {(isTracing || isRevealed) && (
                <path
                  d={R_PATH}
                  stroke="#55AAFF"
                  strokeWidth={isRevealed ? 16 : 14}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  strokeDasharray={isRevealed ? 'none' : totalLength}
                  strokeDashoffset={isRevealed ? 0 : dashOffset}
                  style={{ filter: 'blur(8px)', opacity: isRevealed ? 0.2 : 0.15, transition: isRevealed ? 'opacity 0.3s' : undefined }}
                />
              )}

              {/* Layer 2: Medium glow trail */}
              {(isTracing || isRevealed) && (
                <path
                  d={R_PATH}
                  stroke="url(#rGlow)"
                  strokeWidth={isRevealed ? 10 : 8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  strokeDasharray={isRevealed ? 'none' : totalLength}
                  strokeDashoffset={isRevealed ? 0 : dashOffset}
                  style={{ filter: 'blur(3px)', opacity: isRevealed ? 0.35 : 0.3, transition: isRevealed ? 'opacity 0.3s' : undefined }}
                />
              )}

              {/* Layer 3: Main solid trace */}
              {(isTracing || isRevealed) && (
                <path
                  d={R_PATH}
                  stroke="url(#rGrad)"
                  strokeWidth={isRevealed ? 7 : 4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  strokeDasharray={isRevealed ? 'none' : totalLength}
                  strokeDashoffset={isRevealed ? 0 : dashOffset}
                  style={{ transition: isRevealed ? 'stroke-width 0.3s ease' : undefined }}
                />
              )}

              {/* Leading dot during trace */}
              {isTracing && (
                <g filter="url(#dotGlow)">
                  <circle cx={dotPos.x} cy={dotPos.y} r="6" fill="#FFFFFF" opacity="0.9" />
                  <circle cx={dotPos.x} cy={dotPos.y} r="3.5" fill="#33CCFF" />
                </g>
              )}

              {/* GPS Pin — at start point */}
              {phase === 'appear' && (
                <g transform={`translate(${START_X}, ${START_Y})`}>
                  <motion.g
                    initial={{ scale: 0, y: -30 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 16 }}
                  >
                    <g transform="translate(-14, -36)" filter="url(#pinShadow)">
                      <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 24.5 14 24.5S28 24.5 28 14C28 6.268 21.732 0 14 0z" fill="url(#rGrad)" />
                      <circle cx="14" cy="13" r="5" fill="white" />
                      <circle cx="14" cy="13" r="2" fill="#0088FF" opacity="0.8" />
                    </g>
                  </motion.g>
                </g>
              )}

              {/* Pin at start during trace (small, static) */}
              {isTracing && (
                <g transform={`translate(${START_X}, ${START_Y + 6})`} filter="url(#pinShadow)">
                  <path d={PIN_PATH} fill="url(#rGrad)" transform="scale(0.7)" />
                  <circle cx="0" cy="-14" r="3.5" fill="white" transform="scale(0.7)" />
                </g>
              )}

              {/* Final integrated pin with pulse */}
              {isRevealed && (
                <motion.g
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: [1, 1.08, 1], opacity: 1 }}
                  transition={{ duration: 0.4, ease: 'easeOut', times: [0, 0.6, 1] }}
                >
                  <g transform={`translate(${START_X}, ${START_Y + 6})`} filter="url(#pinShadow)">
                    <path d={PIN_PATH} fill="url(#rGrad)" />
                    <circle cx="0" cy="-14" r="5" fill="white" />
                    <circle cx="0" cy="-14" r="2.2" fill="#0088FF" opacity="0.8" />
                  </g>
                  {/* Pulse ring */}
                  <circle cx={START_X} cy={START_Y + 6} r="8" fill="none" stroke="#0088FF" strokeWidth="1.5" opacity="0.4">
                    <animate attributeName="r" values="8;20" dur="0.4s" fill="freeze" />
                    <animate attributeName="opacity" values="0.4;0" dur="0.4s" fill="freeze" />
                  </circle>
                </motion.g>
              )}
            </svg>

            {/* Shimmer light sweep on reveal */}
            {isRevealed && (
              <motion.div
                className="absolute inset-0 overflow-hidden pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.05 }}
              >
                <motion.div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.8) 50%, transparent 70%)',
                  }}
                  initial={{ x: '-120%' }}
                  animate={{ x: '120%' }}
                  transition={{ duration: 0.45, ease: 'easeInOut' }}
                />
              </motion.div>
            )}
          </div>

          {/* App name */}
          <motion.h1
            className="text-[28px] font-extrabold tracking-[0.14em] mt-1 select-none"
            style={{
              background: 'linear-gradient(135deg, #0044CC 0%, #0088FF 50%, #33BBFF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={isRevealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            RUNCONNECT
          </motion.h1>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
