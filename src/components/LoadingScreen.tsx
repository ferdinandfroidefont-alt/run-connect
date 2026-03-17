import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoadingScreenProps {
  onLoadingComplete: () => void;
}

// Chemin R du SVG (utilisé pour le tracé progressif)
const CHEMIN_R = "M210,400 C150,380,120,330,140,280 C160,230,220,200,280,195 C350,190,410,220,410,280 C410,340,350,380,280,380 C240,380,210,360,210,360 L230,345 C230,345,255,360,280,360 C330,360,380,330,380,280 C380,230,330,210,280,215 C230,220,180,245,165,285 C155,320,175,360,210,375 Z";

// Continents path
const CONTINENTS = "M185,210 c-5,10,15,20,10,35 c-3,10,-20,15,-15,25 c3,8,20,5,25,-2 c5,-7,0,-15,8,-20 c5,-4,15,2,18,10 M310,185 c10,5,20,0,25,10 c3,6,-5,15,-2,20 c5,10,25,5,30,15 c3,7,-10,20,-5,28 c4,5,15,2,20,-3 M240,320 c-10,5,-5,20,-15,25 c-8,4,-20,-2,-25,5 c-4,6,10,15,5,22 c-3,5,-15,2,-20,-2 M320,310 c5,10,20,5,25,15 c3,6,-5,15,-2,20 c5,10,18,5,22,12";

// Marqueur GPS path
const MARQUEUR = "M168,362 C150,340,140,325,140,307 C140,291,153,277,168,277 C183,277,196,291,196,307 C196,325,186,340,168,362 Z";

// Étoile path
const ETOILE = "M0,-50 L10,-10 L50,0 L10,10 L0,50 L-10,10 L-50,0 L-10,-10 Z";

const SVG_W = 512;
const SVG_H = 512;

const APPEAR_DELAY = 200;
const TRACE_DURATION = 1.2;
const REVEAL_DELAY = 1400;
const EXIT_DELAY = 1800;
const TOTAL_DURATION = 2000;

// Point de départ du marqueur
const MARKER_X = 168;
const MARKER_Y = 362;

export const LoadingScreen = ({ onLoadingComplete }: LoadingScreenProps) => {
  const [phase, setPhase] = useState<'appear' | 'trace' | 'reveal' | 'exit'>('appear');
  const [traceProgress, setTraceProgress] = useState(0);
  const [dotPos, setDotPos] = useState({ x: 210, y: 400 });
  const [totalLength, setTotalLength] = useState(800);

  const pathRef = useRef<SVGPathElement>(null);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    document.documentElement.style.backgroundColor = '#f7f9fc';
    document.body.style.backgroundColor = '#f7f9fc';
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

  const traceStrokeWidth = 4 + traceProgress * 4;
  const showDot = isTracing && traceProgress < 0.95;

  // Globe opacity: fades in during trace
  const globeOpacity = isRevealed ? 1 : traceProgress * 0.8;
  const globeScale = isRevealed ? 1 : 0.85 + traceProgress * 0.15;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
        style={{ background: '#f7f9fc' }}
        animate={isExit ? { opacity: 0, y: -20 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeIn' }}
      >
        {/* Subtle ambient glow */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 300, height: 300,
            background: 'radial-gradient(circle, rgba(30,144,255,0.08) 0%, transparent 70%)',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -55%)',
          }}
        />

        <div className="flex flex-col items-center relative">
          <div className="relative" style={{ width: 220, height: 220 }}>
            <svg
              width={220}
              height={220}
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              fill="none"
              style={{ overflow: 'visible' }}
            >
              <defs>
                {/* Hidden measurement path */}
                <path id="tracePath" d={CHEMIN_R} />

                {/* Gradients from the provided SVG */}
                <radialGradient id="grad_terre_mer" cx="256" cy="256" r="128" gradientUnits="userSpaceOnUse">
                  <stop offset="0.3" stopColor="#4FE3D4" />
                  <stop offset="1" stopColor="#3A9AD9" />
                </radialGradient>

                <linearGradient id="grad_chemin_r" gradientUnits="userSpaceOnUse" x1="200" y1="400" x2="400" y2="200">
                  <stop offset="0" stopColor="#1E90FF" />
                  <stop offset="0.6" stopColor="#2060FF" />
                  <stop offset="1" stopColor="#20B2FF" />
                </linearGradient>

                <linearGradient id="grad_marqueur" gradientUnits="userSpaceOnUse" x1="168" y1="362" x2="168" y2="307">
                  <stop offset="0" stopColor="#1050F0" />
                  <stop offset="1" stopColor="#3090FF" />
                </linearGradient>

                {/* Trace gradient */}
                <linearGradient id="traceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1E90FF" />
                  <stop offset="50%" stopColor="#2060FF" />
                  <stop offset="100%" stopColor="#20B2FF" />
                </linearGradient>

                {/* Glow filter for dot */}
                <filter id="dotGlow">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Shadow for the logo */}
                <filter id="logoShadow" x="-20%" y="-20%" width="140%" height="160%">
                  <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#3A9AD9" floodOpacity="0.2" />
                </filter>

                {/* Pin shadow */}
                <filter id="pinShadow">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#1050F0" floodOpacity="0.3" />
                </filter>
              </defs>

              {/* Hidden path for measurement */}
              <path ref={pathRef} d={CHEMIN_R} fill="none" stroke="none" />

              {/* === GLOBE (terre + continents) === */}
              <g
                style={{
                  opacity: globeOpacity,
                  transform: `scale(${globeScale})`,
                  transformOrigin: '256px 256px',
                  transition: isRevealed ? 'opacity 0.3s, transform 0.3s' : undefined,
                }}
                filter={isRevealed ? "url(#logoShadow)" : undefined}
              >
                <circle cx="256" cy="256" r="128" fill="url(#grad_terre_mer)" />
                <path d={CONTINENTS} fill="#80D48D" />
              </g>

              {/* === CHEMIN R (filled, revealed progressively) === */}
              <path
                d={CHEMIN_R}
                fill="url(#grad_chemin_r)"
                style={{
                  opacity: isRevealed ? 1 : traceProgress * 0.9,
                  transition: isRevealed ? 'opacity 0.3s' : undefined,
                }}
              />

              {/* Trace line on top (thin glowing line following the R path) */}
              {isTracing && (
                <>
                  {/* Soft glow trail */}
                  <path
                    d={CHEMIN_R}
                    stroke="#20B2FF"
                    strokeWidth={traceStrokeWidth + 8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    strokeDasharray={totalLength}
                    strokeDashoffset={dashOffset}
                    style={{ filter: 'blur(6px)', opacity: 0.25 }}
                  />
                  {/* Main trace line */}
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
                  <circle cx={dotPos.x} cy={dotPos.y} r="7" fill="#f7f9fc" opacity="0.9" />
                  <circle cx={dotPos.x} cy={dotPos.y} r="4" fill="#20B2FF" />
                </g>
              )}

              {/* === ÉTOILE (appears on reveal with pulse) === */}
              {isRevealed && (
                <motion.g
                  transform="translate(250, 200) scale(0.6)"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 0.9, scale: [0.6, 0.7, 0.6] }}
                  transition={{
                    opacity: { duration: 0.3 },
                    scale: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
                  }}
                >
                  <path d={ETOILE} fill="#FFFFFF" />
                </motion.g>
              )}

              {/* === MARQUEUR GPS === */}
              {phase === 'appear' && (
                <g>
                  <motion.g
                    initial={{ y: -60, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 16 }}
                  >
                    <g filter="url(#pinShadow)">
                      <path d={MARQUEUR} fill="url(#grad_marqueur)" />
                      <circle cx="168" cy="307" r="10" fill="#FFFFFF" />
                    </g>
                  </motion.g>
                </g>
              )}

              {/* Marqueur stays visible after appear */}
              {phase !== 'appear' && (
                <g filter="url(#pinShadow)">
                  <path d={MARQUEUR} fill="url(#grad_marqueur)" />
                  <circle cx="168" cy="307" r="10" fill="#FFFFFF" />
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
                  background: 'radial-gradient(circle, rgba(30,144,255,0.12) 0%, transparent 60%)',
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
              background: 'linear-gradient(135deg, #1050F0 0%, #1E90FF 40%, #20B2FF 100%)',
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
