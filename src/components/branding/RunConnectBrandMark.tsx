import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type RunConnectBrandMarkProps = {
  className?: string;
  animated?: boolean;
};

/**
 * Signe de marque RunConnect :
 * un monogramme-route minimal qui évoque à la fois le mouvement, la carte et la connexion.
 */
export function RunConnectBrandMark({
  className,
  animated = false,
}: RunConnectBrandMarkProps) {
  const Wrapper = animated ? motion.div : "div";

  return (
    <Wrapper
      className={cn("relative block select-none", className)}
      initial={animated ? { opacity: 0, scale: 0.92, y: 8 } : undefined}
      animate={
        animated
          ? {
              opacity: 1,
              scale: 1,
              y: 0,
            }
          : undefined
      }
      transition={
        animated
          ? {
              type: "spring",
              stiffness: 260,
              damping: 22,
              mass: 0.82,
            }
          : undefined
      }
    >
      <svg
        viewBox="0 0 256 256"
        className="block h-full w-full"
        role="img"
        aria-label="RunConnect"
      >
        <defs>
          <linearGradient id="runconnect-bg" x1="32" y1="24" x2="212" y2="228" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#5B8CFF" />
            <stop offset="0.48" stopColor="#2E68FF" />
            <stop offset="1" stopColor="#173EBE" />
          </linearGradient>
          <radialGradient id="runconnect-glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(84 66) rotate(42) scale(146)">
            <stop offset="0" stopColor="rgba(255,255,255,0.34)" />
            <stop offset="1" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          <filter id="runconnect-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="10" stdDeviation="14" floodColor="#0E2C8A" floodOpacity="0.24" />
          </filter>
        </defs>

        <rect x="16" y="16" width="224" height="224" rx="54" fill="url(#runconnect-bg)" />
        <rect x="16" y="16" width="224" height="224" rx="54" fill="url(#runconnect-glow)" />
        <rect x="17" y="17" width="222" height="222" rx="53" fill="none" stroke="rgba(255,255,255,0.16)" />

        <motion.path
          d="M76 178C76 134 101 108 139 108H165C182 108 194 96 194 80C194 64 182 52 165 52C152 52 141 58 133 69L95 122C87 133 76 145 76 163V178Z"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="22"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#runconnect-shadow)"
          initial={animated ? { pathLength: 0.15, opacity: 0.28 } : undefined}
          animate={animated ? { pathLength: 1, opacity: 1 } : undefined}
          transition={animated ? { duration: 0.8, ease: [0.32, 0.72, 0, 1], delay: 0.05 } : undefined}
        />

        <motion.circle
          cx="183"
          cy="74"
          r="14"
          fill="#77F6D3"
          initial={animated ? { scale: 0.5, opacity: 0 } : undefined}
          animate={animated ? { scale: [0.84, 1.06, 1], opacity: 1 } : undefined}
          transition={animated ? { duration: 0.48, delay: 0.38, ease: [0.22, 1, 0.36, 1] } : undefined}
        />
        <circle cx="183" cy="74" r="7.5" fill="#D9FFF5" />

        <motion.path
          d="M92 186C116 166 134 151 150 132"
          fill="none"
          stroke="rgba(255,255,255,0.24)"
          strokeWidth="10"
          strokeLinecap="round"
          initial={animated ? { pathLength: 0, opacity: 0 } : undefined}
          animate={animated ? { pathLength: 1, opacity: 1 } : undefined}
          transition={animated ? { duration: 0.32, delay: 0.28 } : undefined}
        />
      </svg>
    </Wrapper>
  );
}
