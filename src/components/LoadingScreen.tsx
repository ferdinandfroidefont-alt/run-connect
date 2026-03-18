import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoadingScreenProps {
  onLoadingComplete: () => void;
}

// Official R logo — loaded from external high-fidelity SVG

// Simplified center-line trace path following the R's geometry
const TRACE_PATH =
  "M 90 310 " +       // bottom-left leg
  "C 50 280 38 260 42 230 " + // left curve up
  "C 48 200 70 180 100 165 " + // left side going up
  "C 130 150 160 140 190 130 " + // across top
  "C 230 115 270 80 310 60 " +  // top right area
  "C 330 50 350 45 365 55 " +   // right top curve
  "C 380 65 375 85 365 95 " +   // descend right
  "C 340 120 290 155 250 175 " + // curve back left
  "C 220 190 210 200 220 220 " + // middle junction
  "C 240 250 300 280 360 290";   // bottom-right leg

const SVG_W = 440;
const SVG_H = 340;

const APPEAR_DELAY = 200;
const TRACE_DURATION = 1.0;
const REVEAL_DELAY = 1200;
const EXIT_DELAY = 1500;
const TOTAL_DURATION = 1700;

// Start point of trace
const START_X = 90;
const START_Y = 310;

export const LoadingScreen = ({ onLoadingComplete }: LoadingScreenProps) => {
  const [phase, setPhase] = useState<'appear' | 'trace' | 'reveal' | 'exit'>('appear');
  const [traceProgress, setTraceProgress] = useState(0);
  const [dotPos, setDotPos] = useState({ x: START_X, y: START_Y });
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

  // Mask stroke width: starts thin, grows to cover entire R
  const maskStrokeWidth = isRevealed
    ? 500
    : 20 + traceProgress * 380;

  // Trace line visible stroke
  const traceStrokeWidth = 4 + traceProgress * 6;

  // Leading dot visibility (hide when almost done)
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
            background: 'radial-gradient(circle, rgba(32,114,247,0.08) 0%, transparent 70%)',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -55%)',
          }}
        />

        <div className="flex flex-col items-center relative">
          <div className="relative" style={{ width: 220, height: 170 }}>
            <svg
              width={220}
              height={170}
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              fill="none"
              style={{ overflow: 'visible' }}
              shapeRendering="geometricPrecision"
            >
              <defs>
                {/* Measurement path (hidden) */}
                <path id="tracePath" d={TRACE_PATH} />

                {/* Progressive reveal mask */}
                <mask id="revealMask">
                  <rect width={SVG_W} height={SVG_H} fill="black" />
                  <use
                    href="#tracePath"
                    stroke="white"
                    strokeWidth={maskStrokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    strokeDasharray={totalLength}
                    strokeDashoffset={dashOffset}
                  />
                </mask>

                {/* Gradient for trace line */}
                <linearGradient id="traceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#2072f7" />
                  <stop offset="50%" stopColor="#67abf8" />
                  <stop offset="100%" stopColor="#b9d1f1" />
                </linearGradient>

                {/* Glow filter for dot */}
                <filter id="dotGlow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Shadow for the logo — softer, more realistic */}
                <filter id="logoShadow" x="-20%" y="-20%" width="140%" height="160%">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="6" result="shadowBlur" />
                  <feOffset dx="0" dy="3" in="shadowBlur" result="shadowOffset" />
                  <feFlood floodColor="#4a7ec7" floodOpacity="0.10" result="shadowColor" />
                  <feComposite in="shadowColor" in2="shadowOffset" operator="in" result="shadow" />
                  <feMerge>
                    <feMergeNode in="shadow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Glow filter for reveal */}
                <filter id="revealGlow">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Pin shadow */}
                <filter id="pinShadow">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#2072f7" floodOpacity="0.3" />
                </filter>

                {/* Recolor logo: white bg + #2072f7 blue R */}
                <filter id="recolorLogo" colorInterpolationFilters="sRGB" x="0" y="0" width="100%" height="100%">
                  <feColorMatrix type="luminanceToAlpha" result="luma"/>
                  <feComponentTransfer in="luma" result="mask">
                    <feFuncA type="table" tableValues="1 0"/>
                  </feComponentTransfer>
                  <feFlood floodColor="#2072f7" result="color"/>
                  <feComposite in="color" in2="mask" operator="in" result="coloredR"/>
                  <feFlood floodColor="#FFFFFF" result="bg"/>
                  <feMerge>
                    <feMergeNode in="bg"/>
                    <feMergeNode in="coloredR"/>
                  </feMerge>
                </filter>
              </defs>

              {/* Hidden path for measurement */}
              <path ref={pathRef} d={TRACE_PATH} fill="none" stroke="none" />

              {/* === MASKED LOGO (official SVG) === */}
              <g mask="url(#revealMask)" filter={isRevealed ? "url(#logoShadow)" : undefined}>
                <image
                  href="/logo-r.svg"
                  x="0" y="0"
                  width={SVG_W} height={SVG_H}
                  filter="url(#recolorLogo)"
                  preserveAspectRatio="xMidYMid meet"
                />
              </g>

              {/* Trace line on top (thin glowing line following the path) */}
              {isTracing && (
                <>
                  {/* Soft glow trail */}
                  <path
                    d={TRACE_PATH}
                    stroke="#67abf8"
                    strokeWidth={traceStrokeWidth + 8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    strokeDasharray={totalLength}
                    strokeDashoffset={dashOffset}
                    style={{ filter: 'blur(6px)', opacity: 0.2 }}
                  />
                  {/* Main trace line */}
                  <path
                    d={TRACE_PATH}
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
                  <circle cx={dotPos.x} cy={dotPos.y} r="7" fill="#FFFFFF" opacity="0.9" />
                  <circle cx={dotPos.x} cy={dotPos.y} r="4" fill="#67abf8" />
                </g>
              )}

              {/* GPS Pin during appear */}
              {phase === 'appear' && (
                <g transform={`translate(${START_X}, ${START_Y})`}>
                  <motion.g
                    initial={{ scale: 0, y: -30 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 16 }}
                  >
                    <g transform="translate(-14, -36)" filter="url(#pinShadow)">
                      <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 24.5 14 24.5S28 24.5 28 14C28 6.268 21.732 0 14 0z" fill="#2072f7" />
                      <circle cx="14" cy="13" r="5" fill="white" />
                      <circle cx="14" cy="13" r="2" fill="#67abf8" opacity="0.8" />
                    </g>
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
                  background: 'radial-gradient(circle, rgba(32,114,247,0.12) 0%, transparent 60%)',
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
              background: 'linear-gradient(135deg, #1244d4 0%, #2072f7 40%, #67abf8 100%)',
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
