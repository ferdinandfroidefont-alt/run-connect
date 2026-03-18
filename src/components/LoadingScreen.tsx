import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoadingScreenProps {
  onLoadingComplete: () => void;
}

// Official R logo — 5 color layers (back to front), smoothed with Bezier curves
const LAYER_1 = "M 38 253 C 37 257 36 261 36 265 C 38 274 40 282 43 290 C 51 300 59 308 67 313 C 73 316 78 318 83 319 C 90 319 95 319 99 318 C 107 313 114 307 120 301 C 125 291 128 284 129 277 C 128 272 128 267 127 263 C 126 262.5 125.5 262 125 262 C 119 273 113 284 108 295 C 104 300 100 305 96 308 C 93 308 91 308 89 308 C 84 305 78 302 73 299 C 64 292 57 286 51 279 C 48 275 45 271 43 268 Z M 88 237 C 84 240 81 244 80 247 C 80 250 81 254 82 257 C 85 260 88 262 91 263 C 95 263 99 262 103 261 C 106 258 108 255 109 252 C 109 248 108 245 107 243 C 103 239 99 237 96 236 Z M 54 241 C 54 247 54 252 54 257 C 57 264 59 270 62 276 C 66 282 70 288 75 294 C 79 297 82 299 86 300 C 78 289 70 278 64 265 C 63 256 63 248 63 239 C 66 233 70 228 75 224 C 80 222 84 220 89 220 C 87 219 85 218 84 218 C 85 218 86 218 87 218 C 89 214 91 211 93 208 C 100 202 107 198 114 195 C 118 191 121 188 124 185 C 125 186 126 186 127 187 C 129 185 131 184 132 183 C 135 183 137 183 140 183 C 143 185 145 188 147 190 C 146 193 145 195 144 197 C 146 203 147 209 149 215 C 155 224 162 233 169 242 C 192 262 216 280 239 298 C 256 307 273 314 289 319 C 300 322 311 324 322 324 C 341 324 356 324 371 323 C 377 321 382 319 386 317 C 389 317 392 317 394 317 C 395 314 395 311 395 308 C 389 303 384 300 378 297 C 380 296 381 296 382 296 C 374 296 367 296 360 297 C 361 298 362 299 363 299 C 361 301 360 303 358 305 C 350 308 342 310 335 310 C 324 309 314 308 304 307 C 296 304 288 301 279 299 C 264 291 250 283 235 276 C 222 265 210 255 198 244 C 192 236 187 229 182 223 C 180 222 177 222 175 222 C 167 213 159 205 151 197 C 150 193 149 189 149 186 C 153 180 157 176 161 172 C 181 160 198 151 215 142 C 212 143 208 144 205 146 C 205 145 205 143 205 142 C 211 139 218 137 224 135 C 210 140 197 145 184 150 C 185 150 186 151 186 151 C 184 153 182 155 181 157 C 176 157 172 157 168 156 C 167 157 167 158 166 159 C 163 160 161 160 158 160 C 150 166 143 172 136 177 C 128 180 121 182 114 184 C 110 188 106 191 102 195 C 100 194 97 194 95 193 C 89 198 84 202 79 206 C 75 211 71 216 68 221 C 68 220 67 219 67 218 C 69 215 70 214 72 212 C 69 215 66 217 64 220 Z M 373 95 C 363 106 353 117 344 128 C 342 132 340 135 338 139 C 333 145 327 150 322 154 C 301 167 281 179 262 190 C 257 192 252 194 247 195 C 253 199 260 204 266 208 C 273 204 281 198 288 191 C 294 188 301 185 307 183 C 318 176 330 168 341 161 C 348 154 355 147 361 139 C 366 127 370 118 373 112 Z M 66 57 C 68 60 70 63 72 66 C 79 69 86 71 93 71 C 111 71 129 71 147 70 C 160 67 174 63 187 59 C 197 58 200 58 203 58 C 218 59 233 61 248 63 C 263 69 277 75 292 80 C 296 83 299 86 301 89 C 300 93 300 96 299 99 C 298 100 296 101 295 103 C 303 96 310 90 318 84 C 315 80 311 76 308 72 C 294 63 280 56 266 49 C 266 48 267 47 267 46 C 269 46 270 46 272 46 C 257 44 242 42 227 41 C 200 41 173 42 146 43 C 136 44 127 46 118 47 C 121 49 124 51 127 53 C 120 55 113 56 106 57 C 102 55 98 53 94 51 C 86 53 78 54 70 56 C 70 57 70 58 70 59 Z M 156 34 C 149 33 143 31 136 30 C 135 31 134 31 133 32 C 138 33 143 34 148 35 C 143 37 139 39 134 41 C 131 41 127 40 124 40 C 125 38 125 35 125 33 C 118 34 112 34 105 35 C 99 38 92 40 86 43 C 97 39 107 37 118 34 C 119 34 121 35 122 35 C 121 37 121 38 120 40 C 125 41 130 41 135 41 Z";
const LAYER_2 = "M 163 207 C 167 212 171 217 175 221 C 177 222 180 222 182 222 C 185 227 189 232 192 237 C 206 250 221 263 235 275 C 250 283 264 291 279 298 C 287 302 296 304 304 306 C 315 308 325 309 335 309 C 343 308 351 306 358 304 C 359 302 361 301 362 299 C 361 298 361 297 360 296 C 364 296 368 296 372 296 C 355 296 339 296 322 296 C 311 294 301 291 290 289 C 264 277 239 261 213 244 Z M 363 107 C 355 115 348 122 340 129 C 331 138 322 143 313 147 C 287 162 261 175 235 187 C 241 191 247 196 253 200 C 251 199 248 197 246 195 C 260 188 277 180 293 172 C 303 166 312 159 322 153 Z M 266 48 C 280 53 294 62 308 71 C 312 75 316 79 319 82 C 318 84 316 86 315 88 C 317 86 318 85 320 83 C 322 79 323 74 324 70 C 321 66 317 63 314 59 C 304 55 295 51 286 48 Z M 126 53 C 123 51 120 49 117 47 C 119 47 120 46 122 46 C 113 47 105 48 96 50 C 97 50 98 51 99 51 C 98 52 98 52 97 53 C 100 54 103 55 106 56 Z M 169 32 C 160 31 151 30 142 29 C 140 30 139 30 137 31 C 143 31 149 32 155 32 C 156 33 157 34 157 35 C 150 37 142 40 135 42 C 130 42 125 41 120 41 C 121 39 121 37 121 35 C 117 36 113 37 109 37 C 115 40 121 43 127 45 C 133 44 139 44 145 43 C 142 43 139 43 136 42 C 145 41 153 39 162 37 Z";
const LAYER_3 = "M 368 271 C 373 274 377 277 382 280 C 378 283 374 286 370 289 C 371 291 371 292 372 294 C 371 294 369 295 368 295 C 371 295 375 295 378 295 C 380 293 382 290 384 288 C 389 289 394 290 399 290 Z M 131 165 C 119 171 108 176 96 181 C 87 186 78 192 69 198 C 62 204 55 211 49 217 C 46 221 44 225 42 229 C 40 237 39 246 39 254 C 40 258 41 262 43 265 C 49 273 56 280 63 288 C 68 291 72 295 77 298 C 74 295 70 291 67 287 C 63 280 59 273 55 266 C 54 263 53 259 52 256 C 53 248 54 240 55 232 C 60 224 66 216 73 208 C 87 197 102 188 116 179 C 114 179 112 179 110 179 C 112 177 113 175 115 172 Z M 241 127 C 214 136 186 145 159 154 C 165 153 170 152 175 151 C 172 153 169 154 166 156 Z M 90 43 C 92 43 95 42 97 42 C 101 44 105 45 109 47 C 115 46 120 45 126 44 C 123 44 121 44 118 44 C 116 42 115 40 113 38 Z M 193 30 C 186 28 179 26 172 25 C 178 24 184 23 190 22 C 175 24 160 27 145 29 C 152 30 160 30 167 30 C 168 31 169 32 170 33 C 167 35 165 37 162 38 C 154 39 145 41 137 42 C 155 41 173 39 191 36 Z";
const LAYER_4 = "M 381 280 C 375 276 369 272 362 268 C 363 270 365 272 366 274 C 363 278 359 283 356 287 C 357 289 359 292 360 294 C 356 295 353 295 350 295 C 357 295 364 294 371 294 C 370 292 370 291 369 289 Z M 116 229 C 112 227 108 225 105 223 C 100 222 96 221 91 221 C 88 222 85 222 82 223 C 77 226 74 228 70 231 C 67 235 66 239 64 243 C 64 248 64 254 64 259 C 68 266 71 273 75 280 C 80 278 86 275 91 273 C 100 271 109 269 117 268 C 118 269 119 270 120 271 C 119 272 119 274 118 275 C 120 269 122 263 125 257 C 125 253 125 250 125 246 Z M 174 151 C 160 156 146 161 132 165 C 126 168 121 170 115 173 C 114 175 112 177 111 179 Z M 108 47 C 103 46 98 44 93 43 C 81 47 70 52 58 57 Z M 339 35 C 322 29 306 25 289 22 C 263 20 237 20 211 20 C 198 21 186 23 173 25 C 180 27 186 28 193 29 C 192 32 192 34 191 37 C 177 38 163 40 149 41 C 173 40 198 39 222 37 C 241 39 261 41 280 43 C 291 47 301 51 312 54 C 315 56 318 58 320 60 C 322 64 324 69 326 73 C 323 79 319 85 316 90 C 310 95 304 100 298 104 C 260 125 222 142 185 159 C 178 164 170 169 163 173 C 159 178 155 183 151 187 C 152 190 152 194 153 197 C 170 210 188 224 205 237 C 217 244 229 251 241 257 C 266 253 292 248 317 242 C 291 240 265 217 239 193 C 237 191 236 189 234 188 C 233 184 232 179 231 175 C 232 171 234 168 236 165 C 241 160 246 156 251 152 C 288 132 326 112 363 92 C 365 93 368 94 370 95 C 372 90 374 85 375 81 C 375 77 375 74 375 70 C 374 66 373 63 371 60 C 368 55 364 51 361 48 Z";
const LAYER_5 = "M 118 269 C 109 271 100 272 91 274 C 86 276 81 278 76 280 C 82 289 88 298 94 306 C 100 298 107 290 114 281 Z M 365 274 C 364 272 362 270 361 268 C 346 259 331 251 316 242 C 310 243 303 244 297 245 C 290 248 283 250 276 253 C 265 256 254 258 243 258 C 234 253 225 248 216 243 C 232 253 248 264 264 274 C 276 280 289 286 301 291 C 320 293 340 294 359 294 C 358 292 357 290 355 287 Z M 370 93 C 369 94 369 95 368 96 C 368 95 367 94 367 93 C 366 93 365 93 363 93 C 326 112 288 132 251 153 C 245 158 239 164 234 169 C 233 173 232 177 232 181 C 233 182 233 183 234 184 C 242 180 249 177 257 174 C 278 163 299 152 321 140 C 332 132 343 124 354 115 Z M 174 39 C 207 39 234 40 262 42 C 272 44 282 46 292 48 C 301 52 310 57 319 61 C 313 57 307 54 301 50 C 292 47 283 45 274 43 C 257 41 239 39 222 38 Z";

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
