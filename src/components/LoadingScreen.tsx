import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoadingScreenProps {
  onLoadingComplete: () => void;
}

const CHEMIN_R = "M 180,550 C 350,150 670,150 840,550 C 750,650 700,750 620,880 C 860,800 900,1050 650,1100 C 400,1150 300,900 180,550 Z";
const MARQUEUR = "M 420,1200 C 400,1150 480,1130 520,1180 C 560,1230 520,1300 480,1330 C 440,1300 420,1200 420,1200 Z";
const MARKER_CENTER = { x: 500, y: 1225 };

const SVG_W = 1024;
const SVG_H = 1536;

const APPEAR_DELAY = 200;
const TRACE_DURATION = 1.2;
const REVEAL_DELAY = 1400;
const EXIT_DELAY = 1800;
const TOTAL_DURATION = 2000;

export const LoadingScreen = ({ onLoadingComplete }: LoadingScreenProps) => {
  const [phase, setPhase] = useState<'appear' | 'trace' | 'reveal' | 'exit'>('appear');
  const [traceProgress, setTraceProgress] = useState(0);
  const [dotPos, setDotPos] = useState({ x: 180, y: 550 });
  const [totalLength, setTotalLength] = useState(1200);

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
  const traceStrokeWidth = 6 + traceProgress * 6;
  const showDot = isTracing && traceProgress < 0.95;
  const globeOpacity = isRevealed ? 1 : traceProgress * 0.8;
  const globeScale = isRevealed ? 1 : 0.85 + traceProgress * 0.15;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
        style={{ background: '#FFFFFF' }}
        animate={isExit ? { opacity: 0, y: -20 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeIn' }}
      >
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 400, height: 400,
            background: 'radial-gradient(circle, rgba(77,195,247,0.1) 0%, transparent 70%)',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -55%)',
          }}
        />

        <div className="flex flex-col items-center relative">
          <div className="relative" style={{ width: 220, height: 330 }}>
            <svg
              width={220}
              height={330}
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              fill="none"
              style={{ overflow: 'visible' }}
            >
              <defs>
                <path id="tracePath" d={CHEMIN_R} />

                <radialGradient id="globeGrad" cx="512" cy="585" r="350" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#A0D8FF" />
                  <stop offset="100%" stopColor="#0D47A1" />
                </radialGradient>

                <linearGradient id="rGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4FC3F7" />
                  <stop offset="100%" stopColor="#0052A4" />
                </linearGradient>

                <linearGradient id="traceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4FC3F7" />
                  <stop offset="100%" stopColor="#0052A4" />
                </linearGradient>

                <filter id="dropShadow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="30" stdDeviation="30" floodColor="#000000" floodOpacity="0.2" />
                </filter>

                <filter id="dotGlow">
                  <feGaussianBlur stdDeviation="8" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                <filter id="pinShadow">
                  <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#004D99" floodOpacity="0.3" />
                </filter>
              </defs>

              {/* Hidden path for measurement */}
              <path ref={pathRef} d={CHEMIN_R} fill="none" stroke="none" />

              {/* Globe */}
              <g
                style={{
                  opacity: globeOpacity,
                  transform: `scale(${globeScale})`,
                  transformOrigin: '512px 650px',
                  transition: isRevealed ? 'opacity 0.3s, transform 0.3s' : undefined,
                }}
                filter={isRevealed ? "url(#dropShadow)" : undefined}
              >
                <circle cx="512" cy="650" r="350" fill="url(#globeGrad)" />
              </g>

              {/* R path (filled, revealed progressively) */}
              <path
                d={CHEMIN_R}
                fill="url(#rGrad)"
                filter={isRevealed ? "url(#dropShadow)" : undefined}
                style={{
                  opacity: isRevealed ? 1 : traceProgress * 0.9,
                  transition: isRevealed ? 'opacity 0.3s' : undefined,
                }}
              />

              {/* Trace line */}
              {isTracing && (
                <>
                  <path
                    d={CHEMIN_R}
                    stroke="#4FC3F7"
                    strokeWidth={traceStrokeWidth + 12}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    strokeDasharray={totalLength}
                    strokeDashoffset={dashOffset}
                    style={{ filter: 'blur(8px)', opacity: 0.25 }}
                  />
                  <path
                    d={CHEMIN_R}
                    stroke="url(#traceGrad)"
                    strokeWidth={traceStrokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    strokeDasharray={totalLength}
                    strokeDashoffset={dashOffset}
                  />
                </>
              )}

              {/* Leading dot */}
              {showDot && (
                <g filter="url(#dotGlow)">
                  <circle cx={dotPos.x} cy={dotPos.y} r="12" fill="#FFFFFF" opacity="0.9" />
                  <circle cx={dotPos.x} cy={dotPos.y} r="7" fill="#4FC3F7" />
                </g>
              )}

              {/* GPS Marker */}
              {phase === 'appear' && (
                <motion.g
                  initial={{ y: -100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 16 }}
                >
                  <g filter="url(#pinShadow)">
                    <path d={MARQUEUR} fill="#004D99" />
                    <circle cx={MARKER_CENTER.x} cy={MARKER_CENTER.y} r="35" fill="#FFFFFF" />
                  </g>
                </motion.g>
              )}

              {phase !== 'appear' && (
                <g filter="url(#pinShadow)">
                  <path d={MARQUEUR} fill="#004D99" />
                  <circle cx={MARKER_CENTER.x} cy={MARKER_CENTER.y} r="35" fill="#FFFFFF" />
                </g>
              )}
            </svg>

            {/* Shimmer sweep */}
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

            {/* Reveal glow */}
            {isRevealed && (
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'radial-gradient(circle, rgba(77,195,247,0.15) 0%, transparent 60%)',
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
              background: 'linear-gradient(135deg, #4FC3F7 0%, #0052A4 100%)',
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
