import { useId, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

export type RunConnectAnimatedSplashProps = {
  className?: string;
  style?: CSSProperties;
  /** Fond uniquement (ex. avant hydratation) — pas de logo ni texte */
  backgroundOnly?: boolean;
  /** Sortie douce comme la maquette JSX */
  exiting?: boolean;
  /**
   * Durée du remplissage de la barre (maquette : durée splash totale − 200 ms).
   * Défaut 2000 ms pour `duration === 2200`.
   */
  barFillDurationMs?: number;
};

const SPLASH_BG =
  "linear-gradient(180deg, #1B6FE6 0%, #2D81F0 50%, #4090F5 100%)";

/**
 * Splash plein écran aligné sur la maquette RunConnect (19).jsx :
 * dégradé vertical, pin + ondes, titre, barre « Chargement ».
 */
export function RunConnectAnimatedSplash({
  className,
  style,
  backgroundOnly = false,
  exiting = false,
  barFillDurationMs = 2000,
}: RunConnectAnimatedSplashProps) {
  const rawId = useId().replace(/:/g, "");
  const pinFillId = `splashPinFill-${rawId}`;
  const pinHlId = `splashPinHL-${rawId}`;

  if (backgroundOnly) {
    return (
      <div
        className={cn("pointer-events-none fixed inset-0 z-[100]", className)}
        style={{
          background: SPLASH_BG,
          ...style,
        }}
        aria-hidden
      />
    );
  }

  return (
    <div
      className={cn(className)}
      style={{
        position: "fixed",
        inset: 0,
        background: SPLASH_BG,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: exiting ? 0 : 1,
        transition: "opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        overflow: "hidden",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
        ...style,
      }}
    >
      <style>{`
        @keyframes rc-splash-wave-propagate {
          0%   { opacity: 0; }
          25%  { opacity: var(--max-opacity, 0.5); }
          80%  { opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes rc-splash-pin-pop {
          0%   { transform: scale(0.7); opacity: 0; }
          60%  { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes rc-splash-title-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes rc-splash-bar-fill {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: "min(46vw, 190px)",
            aspectRatio: "1 / 1",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation:
              "rc-splash-pin-pop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both",
          }}
        >
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 200 200"
            style={{ overflow: "visible" }}
            aria-hidden
          >
            <defs>
              <linearGradient id={pinFillId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="60%" stopColor="#FFFFFF" />
                <stop offset="100%" stopColor="#E0EBFB" />
              </linearGradient>
              <radialGradient id={pinHlId} cx="0.3" cy="0.25" r="0.7">
                <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </radialGradient>
            </defs>

            <path
              d="M 62 80 Q 48 100 62 122"
              stroke="rgba(255,255,255,0.9)"
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
              style={
                {
                  animation: "rc-splash-wave-propagate 1.8s ease-out infinite",
                  "--max-opacity": 0.55,
                } as CSSProperties
              }
            />
            <path
              d="M 48 70 Q 26 100 48 132"
              stroke="rgba(255,255,255,0.9)"
              strokeWidth="5.5"
              fill="none"
              strokeLinecap="round"
              style={
                {
                  animation:
                    "rc-splash-wave-propagate 1.8s ease-out infinite 0.35s",
                  "--max-opacity": 0.4,
                } as CSSProperties
              }
            />
            <path
              d="M 32 62 Q 4 100 32 140"
              stroke="rgba(255,255,255,0.9)"
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
              style={
                {
                  animation:
                    "rc-splash-wave-propagate 1.8s ease-out infinite 0.7s",
                  "--max-opacity": 0.25,
                } as CSSProperties
              }
            />

            <path
              d="M 138 80 Q 152 100 138 122"
              stroke="rgba(255,255,255,0.9)"
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
              style={
                {
                  animation: "rc-splash-wave-propagate 1.8s ease-out infinite",
                  "--max-opacity": 0.55,
                } as CSSProperties
              }
            />
            <path
              d="M 152 70 Q 174 100 152 132"
              stroke="rgba(255,255,255,0.9)"
              strokeWidth="5.5"
              fill="none"
              strokeLinecap="round"
              style={
                {
                  animation:
                    "rc-splash-wave-propagate 1.8s ease-out infinite 0.35s",
                  "--max-opacity": 0.4,
                } as CSSProperties
              }
            />
            <path
              d="M 168 62 Q 196 100 168 140"
              stroke="rgba(255,255,255,0.9)"
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
              style={
                {
                  animation:
                    "rc-splash-wave-propagate 1.8s ease-out infinite 0.7s",
                  "--max-opacity": 0.25,
                } as CSSProperties
              }
            />

            <ellipse
              cx="100"
              cy="170"
              rx="22"
              ry="4.5"
              fill="rgba(0,40,120,0.45)"
            />

            <path
              d="M 100 36
                 C 76 36, 58 54, 58 78
                 C 58 102, 86 135, 100 160
                 C 114 135, 142 102, 142 78
                 C 142 54, 124 36, 100 36 Z"
              fill={`url(#${pinFillId})`}
              stroke="rgba(0,40,120,0.06)"
              strokeWidth="1"
            />
            <path
              d="M 100 36
                 C 76 36, 58 54, 58 78
                 C 58 102, 86 135, 100 160
                 C 114 135, 142 102, 142 78
                 C 142 54, 124 36, 100 36 Z"
              fill={`url(#${pinHlId})`}
            />

            <circle cx="100" cy="78" r="14" fill="#1B6FE6" />
          </svg>
        </div>

        <h1
          style={{
            fontSize: "clamp(32px, 8.5vw, 42px)",
            fontWeight: 900,
            color: "white",
            letterSpacing: "-0.035em",
            margin: 0,
            marginTop: 18,
            lineHeight: 1,
            textAlign: "center",
            animation:
              "rc-splash-title-up 0.6s cubic-bezier(0.32, 0.72, 0, 1) 0.4s both",
            textShadow: "0 2px 12px rgba(0,30,90,0.15)",
          }}
        >
          RunConnect
        </h1>

        <div
          style={{
            width: "min(58vw, 220px)",
            marginTop: 56,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            animation: "rc-splash-title-up 0.6s ease-out 0.55s both",
          }}
        >
          <div
            style={{
              width: "100%",
              height: 4,
              background: "rgba(255,255,255,0.25)",
              borderRadius: 9999,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: 0,
                background: "white",
                borderRadius: 9999,
                boxShadow: "0 0 8px rgba(255,255,255,0.6)",
                animation: `rc-splash-bar-fill ${barFillDurationMs}ms cubic-bezier(0.4, 0, 0.2, 1) forwards`,
              }}
            />
          </div>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "rgba(255,255,255,0.7)",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            Chargement
          </p>
        </div>
      </div>
    </div>
  );
}
