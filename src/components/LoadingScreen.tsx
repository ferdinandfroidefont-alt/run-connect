import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoadingScreenProps {
  onLoadingComplete: () => void;
}

// The exact blue from the RunConnect icon
const BRAND_BLUE = '#2563EB';

// Official R logo — 5 layers combined as white silhouette
const LAYER_1 = "M 38 253 L 36 265 L 43 290 L 67 313 L 83 319 L 99 318 L 120 301 L 129 277 L 127 263 L 125 262 L 108 295 L 96 308 L 89 308 L 73 299 L 51 279 L 43 268 Z M 88 237 L 80 247 L 82 257 L 91 263 L 103 261 L 109 252 L 107 243 L 96 236 Z M 54 241 L 54 257 L 62 276 L 75 294 L 86 300 L 64 265 L 63 239 L 75 224 L 89 220 L 84 218 L 87 218 L 93 208 L 114 195 L 124 185 L 127 187 L 132 183 L 140 183 L 147 190 L 144 197 L 149 215 L 169 242 L 239 298 L 289 319 L 322 324 L 371 323 L 386 317 L 394 317 L 395 308 L 378 297 L 382 296 L 360 297 L 363 299 L 358 305 L 335 310 L 304 307 L 279 299 L 235 276 L 198 244 L 182 223 L 175 222 L 151 197 L 149 186 L 161 172 L 215 142 L 205 146 L 205 142 L 224 135 L 184 150 L 186 151 L 181 157 L 168 156 L 166 159 L 158 160 L 136 177 L 114 184 L 102 195 L 95 193 L 79 206 L 68 221 L 67 218 L 72 212 L 64 220 Z M 373 95 L 344 128 L 338 139 L 322 154 L 262 190 L 247 195 L 266 208 L 288 191 L 307 183 L 341 161 L 361 139 L 373 112 Z M 66 57 L 72 66 L 93 71 L 147 70 L 187 59 L 203 58 L 248 63 L 292 80 L 301 89 L 299 99 L 295 103 L 318 84 L 308 72 L 266 49 L 267 46 L 272 46 L 227 41 L 146 43 L 118 47 L 127 53 L 106 57 L 94 51 L 70 56 L 70 59 Z M 156 34 L 136 30 L 133 32 L 148 35 L 134 41 L 124 40 L 125 33 L 105 35 L 86 43 L 118 34 L 122 35 L 120 40 L 135 41 Z";
const LAYER_2 = "M 163 207 L 175 221 L 182 222 L 192 237 L 235 275 L 279 298 L 304 306 L 335 309 L 358 304 L 362 299 L 360 296 L 372 296 L 322 296 L 290 289 L 213 244 Z M 363 107 L 340 129 L 313 147 L 235 187 L 253 200 L 246 195 L 293 172 L 322 153 Z M 266 48 L 308 71 L 319 82 L 315 88 L 320 83 L 324 70 L 314 59 L 286 48 Z M 126 53 L 117 47 L 122 46 L 96 50 L 99 51 L 97 53 L 106 56 Z M 169 32 L 142 29 L 137 31 L 155 32 L 157 35 L 135 42 L 120 41 L 121 35 L 109 37 L 127 45 L 145 43 L 136 42 L 162 37 Z";
const LAYER_3 = "M 368 271 L 382 280 L 370 289 L 372 294 L 368 295 L 378 295 L 384 288 L 399 290 Z M 131 165 L 96 181 L 69 198 L 49 217 L 42 229 L 39 254 L 43 265 L 63 288 L 77 298 L 67 287 L 55 266 L 52 256 L 55 232 L 73 208 L 116 179 L 110 179 L 115 172 Z M 241 127 L 159 154 L 175 151 L 166 156 Z M 90 43 L 97 42 L 109 47 L 126 44 L 118 44 L 113 38 Z M 193 30 L 172 25 L 190 22 L 145 29 L 167 30 L 170 33 L 162 38 L 137 42 L 191 36 Z";
const LAYER_4 = "M 381 280 L 362 268 L 366 274 L 356 287 L 360 294 L 350 295 L 371 294 L 369 289 Z M 116 229 L 105 223 L 91 221 L 82 223 L 70 231 L 64 243 L 64 259 L 75 280 L 91 273 L 117 268 L 120 271 L 118 275 L 125 257 L 125 246 Z M 174 151 L 132 165 L 115 173 L 111 179 Z M 108 47 L 93 43 L 58 57 Z M 339 35 L 289 22 L 211 20 L 173 25 L 193 29 L 191 37 L 149 41 L 222 37 L 280 43 L 312 54 L 320 60 L 326 73 L 316 90 L 298 104 L 185 159 L 163 173 L 151 187 L 153 197 L 205 237 L 241 257 L 317 242 L 239 193 L 234 188 L 231 175 L 236 165 L 251 152 L 363 92 L 370 95 L 375 81 L 375 70 L 371 60 L 361 48 Z";
const LAYER_5 = "M 118 269 L 91 274 L 76 280 L 94 306 L 114 281 Z M 365 274 L 361 268 L 316 242 L 297 245 L 276 253 L 243 258 L 216 243 L 264 274 L 301 291 L 359 294 L 355 287 Z M 370 93 L 368 96 L 367 93 L 363 93 L 251 153 L 234 169 L 232 181 L 234 184 L 257 174 L 321 140 L 354 115 Z M 174 39 L 262 42 L 292 48 L 319 61 L 301 50 L 274 43 L 222 38 Z";

const SVG_W = 440;
const SVG_H = 340;

export const LoadingScreen = ({ onLoadingComplete }: LoadingScreenProps) => {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    // Force the same blue everywhere during splash
    document.documentElement.style.backgroundColor = BRAND_BLUE;
    document.body.style.backgroundColor = BRAND_BLUE;

    const exitTimer = setTimeout(() => setExiting(true), 1800);
    const completeTimer = setTimeout(onLoadingComplete, 2200);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
      document.documentElement.style.removeProperty('background-color');
      document.body.style.removeProperty('background-color');
    };
  }, [onLoadingComplete]);

  return (
    <AnimatePresence>
      {!exiting ? (
        <motion.div
          key="splash"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          style={{
            background: BRAND_BLUE,
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
        >
          {/* White R logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <svg
              width={180}
              height={140}
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              fill="none"
            >
              <path d={LAYER_1} fill="white" />
              <path d={LAYER_2} fill="white" />
              <path d={LAYER_3} fill="white" />
              <path d={LAYER_4} fill="white" />
              <path d={LAYER_5} fill="white" />
            </svg>
          </motion.div>

          {/* App name */}
          <motion.h1
            className="text-[22px] font-bold tracking-[0.18em] mt-6 select-none"
            style={{ color: 'rgba(255,255,255,0.95)' }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease: 'easeOut' }}
          >
            RUNCONNECT
          </motion.h1>
        </motion.div>
      ) : (
        <motion.div
          key="splash-exit"
          className="fixed inset-0 z-50"
          style={{ background: BRAND_BLUE }}
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
        />
      )}
    </AnimatePresence>
  );
};
