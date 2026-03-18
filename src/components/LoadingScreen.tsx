import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoadingScreenProps {
  onLoadingComplete: () => void;
}

// Official R logo — 5 color layers (back to front)
const LAYER_1 = "M 38 253 L 36 265 L 43 290 L 67 313 L 83 319 L 99 318 L 120 301 L 129 277 L 127 263 L 125 262 L 108 295 L 96 308 L 89 308 L 73 299 L 51 279 L 43 268 Z M 88 237 L 80 247 L 82 257 L 91 263 L 103 261 L 109 252 L 107 243 L 96 236 Z M 54 241 L 54 257 L 62 276 L 75 294 L 86 300 L 64 265 L 63 239 L 75 224 L 89 220 L 84 218 L 87 218 L 93 208 L 114 195 L 124 185 L 127 187 L 132 183 L 140 183 L 147 190 L 144 197 L 149 215 L 169 242 L 239 298 L 289 319 L 322 324 L 371 323 L 386 317 L 394 317 L 395 308 L 378 297 L 382 296 L 360 297 L 363 299 L 358 305 L 335 310 L 304 307 L 279 299 L 235 276 L 198 244 L 182 223 L 175 222 L 151 197 L 149 186 L 161 172 L 215 142 L 205 146 L 205 142 L 224 135 L 184 150 L 186 151 L 181 157 L 168 156 L 166 159 L 158 160 L 136 177 L 114 184 L 102 195 L 95 193 L 79 206 L 68 221 L 67 218 L 72 212 L 64 220 Z M 373 95 L 344 128 L 338 139 L 322 154 L 262 190 L 247 195 L 266 208 L 288 191 L 307 183 L 341 161 L 361 139 L 373 112 Z M 66 57 L 72 66 L 93 71 L 147 70 L 187 59 L 203 58 L 248 63 L 292 80 L 301 89 L 299 99 L 295 103 L 318 84 L 308 72 L 266 49 L 267 46 L 272 46 L 227 41 L 146 43 L 118 47 L 127 53 L 106 57 L 94 51 L 70 56 L 70 59 Z M 156 34 L 136 30 L 133 32 L 148 35 L 134 41 L 124 40 L 125 33 L 105 35 L 86 43 L 118 34 L 122 35 L 120 40 L 135 41 Z";
const LAYER_2 = "M 163 207 L 175 221 L 182 222 L 192 237 L 235 275 L 279 298 L 304 306 L 335 309 L 358 304 L 362 299 L 360 296 L 372 296 L 322 296 L 290 289 L 213 244 Z M 363 107 L 340 129 L 313 147 L 235 187 L 253 200 L 246 195 L 293 172 L 322 153 Z M 266 48 L 308 71 L 319 82 L 315 88 L 320 83 L 324 70 L 314 59 L 286 48 Z M 126 53 L 117 47 L 122 46 L 96 50 L 99 51 L 97 53 L 106 56 Z M 169 32 L 142 29 L 137 31 L 155 32 L 157 35 L 135 42 L 120 41 L 121 35 L 109 37 L 127 45 L 145 43 L 136 42 L 162 37 Z";
const LAYER_3 = "M 368 271 L 382 280 L 370 289 L 372 294 L 368 295 L 378 295 L 384 288 L 399 290 Z M 131 165 L 96 181 L 69 198 L 49 217 L 42 229 L 39 254 L 43 265 L 63 288 L 77 298 L 67 287 L 55 266 L 52 256 L 55 232 L 73 208 L 116 179 L 110 179 L 115 172 Z M 241 127 L 159 154 L 175 151 L 166 156 Z M 90 43 L 97 42 L 109 47 L 126 44 L 118 44 L 113 38 Z M 193 30 L 172 25 L 190 22 L 145 29 L 167 30 L 170 33 L 162 38 L 137 42 L 191 36 Z";
const LAYER_4 = "M 381 280 L 362 268 L 366 274 L 356 287 L 360 294 L 350 295 L 371 294 L 369 289 Z M 116 229 L 105 223 L 91 221 L 82 223 L 70 231 L 64 243 L 64 259 L 75 280 L 91 273 L 117 268 L 120 271 L 118 275 L 125 257 L 125 246 Z M 174 151 L 132 165 L 115 173 L 111 179 Z M 108 47 L 93 43 L 58 57 Z M 339 35 L 289 22 L 211 20 L 173 25 L 193 29 L 191 37 L 149 41 L 222 37 L 280 43 L 312 54 L 320 60 L 326 73 L 316 90 L 298 104 L 185 159 L 163 173 L 151 187 L 153 197 L 205 237 L 241 257 L 317 242 L 239 193 L 234 188 L 231 175 L 236 165 L 251 152 L 363 92 L 370 95 L 375 81 L 375 70 L 371 60 L 361 48 Z";
const LAYER_5 = "M 118 269 L 91 274 L 76 280 L 94 306 L 114 281 Z M 365 274 L 361 268 L 316 242 L 297 245 L 276 253 L 243 258 L 216 243 L 264 274 L 301 291 L 359 294 L 355 287 Z M 370 93 L 368 96 L 367 93 L 363 93 L 251 153 L 234 169 L 232 181 L 234 184 L 257 174 L 321 140 L 354 115 Z M 174 39 L 262 42 L 292 48 L 319 61 L 301 50 L 274 43 L 222 38 Z";

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
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Shadow for the logo */}
                <filter id="logoShadow" x="-20%" y="-20%" width="140%" height="160%">
                  <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#7ca0d8" floodOpacity="0.18" />
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
              </defs>

              {/* Hidden path for measurement */}
              <path ref={pathRef} d={TRACE_PATH} fill="none" stroke="none" />

              {/* === MASKED LOGO LAYERS === */}
              <g mask="url(#revealMask)" filter={isRevealed ? "url(#logoShadow)" : undefined}>
                <path d={LAYER_1} fill="#dce8f8" />
                <path d={LAYER_2} fill="#b9d1f1" />
                <path d={LAYER_3} fill="#67abf8" />
                <path d={LAYER_4} fill="#2072f7" />
                <path d={LAYER_5} fill="#1244d4" />
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
