import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoadingScreenProps {
  onLoadingComplete: () => void;
}

// The route R path
const ROUTE_PATH =
  "M120 260 C120 210 170 180 220 180 C300 180 380 130 420 120 C470 110 520 130 500 170 C470 230 360 220 300 250 C240 280 200 310 170 320";

const SVG_W = 600;
const SVG_H = 400;

const APPEAR_DELAY = 200;
const TRACE_DURATION = 1.0;
const REVEAL_DELAY = 1200;
const EXIT_DELAY = 1500;
const TOTAL_DURATION = 1700;

// Pin position
const PIN_X = 90;
const PIN_Y = 270;

// Start of the route path
const START_X = 120;
const START_Y = 260;

export const LoadingScreen = ({ onLoadingComplete }: LoadingScreenProps) => {
  const [phase, setPhase] = useState<'appear' | 'trace' | 'reveal' | 'exit'>('appear');
  const [traceProgress, setTraceProgress] = useState(0);
  const [dotPos, setDotPos] = useState({ x: START_X, y: START_Y });
  const [totalLength, setTotalLength] = useState(800);

  const pathRef = useRef<SVGPathElement>(null);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    document.documentElement.style.backgroundColor = '#FFFFFF';
    document.body.style.backgroundColor = '#FFFFFF';
    return () => {
      document.documentElement.style.removeProperty('background-color');
      document.body.style.removeProperty('background-color');
    };
  }, []);

  useEffect(() => {
    if (pathRef.current) {
      setTotalLength(pathRef.current.getTotalLength());
    }
  }, []);

  const animateTrace = useCallback((timestamp: number) => {
    if (!startTimeRef.current) startTimeRef.current = timestamp;
    const elapsed = (timestamp - startTimeRef.current) / 1000;
    const t = Math.min(elapsed / TRACE_DURATION, 1);
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    setTraceProgress(eased);

    if (pathRef.current) {
      const point = pathRef.current.getPointAtLength(eased * totalLength);
      setDotPos({ x: point.x, y: point.y });
    }

    if (t < 1) {
      rafRef.current = requestAnimationFrame(animateTrace);
    }
  }, [totalLength]);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('trace'), APPEAR_DELAY);
    const t2 = setTimeout(() => setPhase('reveal'), REVEAL_DELAY);
    const t3 = setTimeout(() => setPhase('exit'), EXIT_DELAY);
    const t4 = setTimeout(onLoadingComplete, TOTAL_DURATION);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onLoadingComplete]);

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

  const showDot = isTracing && traceProgress < 0.95;

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
            background: 'radial-gradient(circle, rgba(47,125,225,0.08) 0%, transparent 70%)',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -55%)',
          }}
        />

        <div className="flex flex-col items-center relative">
          <div className="relative" style={{ width: 220, height: 148 }}>
            <svg
              width={220}
              height={148}
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              fill="none"
              style={{ overflow: 'visible' }}
            >
              <defs>
                {/* Blue gradient */}
                <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#5ec9ff" />
                  <stop offset="40%" stopColor="#2f7de1" />
                  <stop offset="100%" stopColor="#1b3dbf" />
                </linearGradient>

                {/* Glow filter for the route */}
                <filter id="routeGlow">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Dot glow */}
                <filter id="dotGlow">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Pin shadow */}
                <filter id="pinShadow">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#2f7de1" floodOpacity="0.3" />
                </filter>

                {/* Reveal glow for final state */}
                <filter id="revealGlow" x="-20%" y="-20%" width="140%" height="160%">
                  <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#2f7de1" floodOpacity="0.25" />
                </filter>
              </defs>

              {/* Hidden path for measurement */}
              <path ref={pathRef} d={ROUTE_PATH} fill="none" stroke="none" />

              {/* === MAIN ROUTE PATH === */}
              <path
                d={ROUTE_PATH}
                fill="none"
                stroke="url(#blueGradient)"
                strokeWidth={28}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={totalLength}
                strokeDashoffset={dashOffset}
                filter={isRevealed ? "url(#routeGlow)" : undefined}
              />

              {/* Soft glow trail during trace */}
              {isTracing && (
                <path
                  d={ROUTE_PATH}
                  fill="none"
                  stroke="#5ec9ff"
                  strokeWidth={40}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={totalLength}
                  strokeDashoffset={dashOffset}
                  style={{ filter: 'blur(8px)', opacity: 0.15 }}
                />
              )}

              {/* Leading dot */}
              {showDot && (
                <g filter="url(#dotGlow)">
                  <circle cx={dotPos.x} cy={dotPos.y} r="10" fill="#FFFFFF" opacity="0.9" />
                  <circle cx={dotPos.x} cy={dotPos.y} r="6" fill="#5ec9ff" />
                </g>
              )}

              {/* GPS Pin */}
              {(phase === 'appear' || isRevealed) && (
                <g transform={`translate(${PIN_X},${PIN_Y})`}>
                  <motion.g
                    initial={{ scale: 0, y: -30 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 16 }}
                    filter="url(#pinShadow)"
                  >
                    <path
                      d="M30 0 C10 0 0 15 0 30 C0 50 30 80 30 80 C30 80 60 50 60 30 C60 15 50 0 30 0 Z"
                      fill="url(#blueGradient)"
                    />
                    <circle cx="30" cy="30" r="10" fill="white" />
                  </motion.g>
                </g>
              )}
            </svg>

            {/* Shimmer light sweep — only when fully revealed */}
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
                    background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.7) 48%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0.7) 52%, transparent 70%)',
                  }}
                  initial={{ x: '-120%' }}
                  animate={{ x: '120%' }}
                  transition={{ duration: 0.5, ease: 'easeInOut' }}
                />
              </motion.div>
            )}

            {/* Reveal glow pulse */}
            {isRevealed && (
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'radial-gradient(circle, rgba(47,125,225,0.15) 0%, transparent 60%)',
                }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: [0, 1, 0], scale: [0.8, 1.1, 1.2] }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            )}
          </div>

          {/* App name */}
          <motion.h1
            className="text-[28px] font-extrabold tracking-[0.14em] mt-1 select-none"
            style={{
              background: 'linear-gradient(135deg, #1b3dbf 0%, #2f7de1 40%, #5ec9ff 100%)',
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
