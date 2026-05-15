import { useId, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

export type RunConnectAnimatedSplashProps = {
  className?: string;
  style?: CSSProperties;
  /** Fond uniquement (ex. avant hydratation) — pas de logo ni texte */
  backgroundOnly?: boolean;
  /** Sortie douce comme la maquette Figma/JSX */
  exiting?: boolean;
};

/**
 * Splash plein écran aligné sur la maquette RunConnect (18).jsx :
 * dégradé, squircle, pin SVG + ondes, titrage, points animés.
 */
export function RunConnectAnimatedSplash({
  className,
  style,
  backgroundOnly = false,
  exiting = false,
}: RunConnectAnimatedSplashProps) {
  const rawId = useId().replace(/:/g, "");
  const pinFillId = `pinFill-${rawId}`;
  const pinHighlightId = `pinHighlight-${rawId}`;

  if (backgroundOnly) {
    return (
      <div
        className={cn("pointer-events-none fixed inset-0 z-[100]", className)}
        style={{
          background:
            "linear-gradient(155deg, #0064D6 0%, #007AFF 45%, #5AC8FA 100%)",
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
        background:
          "linear-gradient(155deg, #0064D6 0%, #007AFF 45%, #5AC8FA 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
        opacity: exiting ? 0 : 1,
        transition: "opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        overflow: "hidden",
        ...style,
      }}
    >
      <style>{`
        @keyframes rc-splash-pulse-ring {
          0%   { transform: scale(0.95); opacity: 0.45; }
          70%  { transform: scale(1.4); opacity: 0; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes rc-splash-pulse-ring-2 {
          0%   { transform: scale(0.95); opacity: 0; }
          15%  { transform: scale(0.95); opacity: 0.35; }
          70%  { transform: scale(1.5); opacity: 0; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes rc-splash-logo-pop {
          0%   { transform: scale(0.6) rotate(-8deg); opacity: 0; }
          60%  { transform: scale(1.06) rotate(2deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes rc-splash-logo-breathe {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.03); }
        }
        @keyframes rc-splash-fade-up {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes rc-splash-loader-dot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40%           { transform: scale(1);   opacity: 1; }
        }
        @keyframes rc-splash-shine {
          0%   { transform: translateX(-120%) skewX(-20deg); }
          60%  { transform: translateX(220%) skewX(-20deg); }
          100% { transform: translateX(220%) skewX(-20deg); }
        }
        @keyframes rc-splash-wave-pulse {
          0%, 100% { opacity: var(--wave-opacity, 0.45); }
          50%      { opacity: 0.15; }
        }
      `}</style>

      <div
        style={{
          position: "relative",
          width: 132,
          height: 132,
          marginBottom: 36,
          animation: "rc-splash-logo-pop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 32,
            background: "rgba(255,255,255,0.22)",
            animation: "rc-splash-pulse-ring 2.2s ease-out infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 32,
            background: "rgba(255,255,255,0.16)",
            animation: "rc-splash-pulse-ring-2 2.2s ease-out infinite",
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 32,
            background:
              "linear-gradient(135deg, #4DA2FF 0%, #007AFF 50%, #0050B3 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow:
              "0 24px 60px rgba(0,30,80,0.45), 0 8px 20px rgba(0,30,80,0.3), inset 0 2px 1px rgba(255,255,255,0.35), inset 0 -3px 2px rgba(0,40,120,0.4)",
            overflow: "hidden",
            animation: "rc-splash-logo-breathe 3.5s ease-in-out infinite 0.8s",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "55%",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 100%)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 30,
              height: "100%",
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)",
              animation: "rc-splash-shine 3.5s ease-in-out infinite 1.2s",
              pointerEvents: "none",
            }}
          />

          <svg
            width="74%"
            height="74%"
            viewBox="0 0 200 200"
            style={{ position: "relative", zIndex: 1, overflow: "visible" }}
            aria-hidden
          >
            <defs>
              <linearGradient id={pinFillId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="55%" stopColor="#FFFFFF" />
                <stop offset="100%" stopColor="#D8E6FA" />
              </linearGradient>
              <radialGradient id={pinHighlightId} cx="0.3" cy="0.25" r="0.7">
                <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </radialGradient>
            </defs>

            <path
              d="M 62 80 Q 48 100 62 122"
              stroke="rgba(255,255,255,0.55)"
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
              style={{
                animation: "rc-splash-wave-pulse 2.2s ease-in-out infinite",
              }}
            />
            <path
              d="M 48 70 Q 26 100 48 132"
              stroke="rgba(255,255,255,0.38)"
              strokeWidth="5.5"
              fill="none"
              strokeLinecap="round"
              style={{
                animation: "rc-splash-wave-pulse 2.2s ease-in-out infinite 0.2s",
              }}
            />
            <path
              d="M 32 62 Q 4 100 32 140"
              stroke="rgba(255,255,255,0.22)"
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
              style={{
                animation: "rc-splash-wave-pulse 2.2s ease-in-out infinite 0.4s",
              }}
            />

            <path
              d="M 138 80 Q 152 100 138 122"
              stroke="rgba(255,255,255,0.55)"
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
              style={{
                animation: "rc-splash-wave-pulse 2.2s ease-in-out infinite 0.1s",
              }}
            />
            <path
              d="M 152 70 Q 174 100 152 132"
              stroke="rgba(255,255,255,0.38)"
              strokeWidth="5.5"
              fill="none"
              strokeLinecap="round"
              style={{
                animation: "rc-splash-wave-pulse 2.2s ease-in-out infinite 0.3s",
              }}
            />
            <path
              d="M 168 62 Q 196 100 168 140"
              stroke="rgba(255,255,255,0.22)"
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
              style={{
                animation: "rc-splash-wave-pulse 2.2s ease-in-out infinite 0.5s",
              }}
            />

            <ellipse
              cx="100"
              cy="170"
              rx="20"
              ry="4"
              fill="rgba(0,40,120,0.5)"
            />

            <path
              d="M 100 36
                 C 76 36, 58 54, 58 78
                 C 58 102, 86 135, 100 160
                 C 114 135, 142 102, 142 78
                 C 142 54, 124 36, 100 36 Z"
              fill={`url(#${pinFillId})`}
              stroke="rgba(0,40,120,0.08)"
              strokeWidth="1"
            />

            <path
              d="M 100 36
                 C 76 36, 58 54, 58 78
                 C 58 102, 86 135, 100 160
                 C 114 135, 142 102, 142 78
                 C 142 54, 124 36, 100 36 Z"
              fill={`url(#${pinHighlightId})`}
            />

            <circle cx="100" cy="78" r="13" fill="#007AFF" />
            <circle cx="96" cy="74" r="4" fill="rgba(255,255,255,0.35)" />
          </svg>
        </div>
      </div>

      <h1
        style={{
          fontSize: 42,
          fontWeight: 900,
          color: "white",
          letterSpacing: "-0.035em",
          margin: 0,
          marginBottom: 10,
          animation:
            "rc-splash-fade-up 0.6s cubic-bezier(0.32, 0.72, 0, 1) 0.15s both",
          textShadow: "0 2px 12px rgba(0,0,0,0.12)",
        }}
      >
        RunConnect
      </h1>

      <p
        style={{
          fontSize: 13,
          fontWeight: 800,
          color: "rgba(255,255,255,0.9)",
          letterSpacing: "0.18em",
          margin: 0,
          marginBottom: 56,
          textTransform: "uppercase",
          animation:
            "rc-splash-fade-up 0.6s cubic-bezier(0.32, 0.72, 0, 1) 0.3s both",
        }}
      >
        Cours · Connecte · Performe
      </p>

      <div
        style={{
          display: "flex",
          gap: 9,
          animation: "rc-splash-fade-up 0.6s ease-out 0.5s both",
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 9,
              height: 9,
              borderRadius: "50%",
              background: "white",
              boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
              animation: `rc-splash-loader-dot 1.1s cubic-bezier(0.4, 0, 0.2, 1) ${
                i * 0.18
              }s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
