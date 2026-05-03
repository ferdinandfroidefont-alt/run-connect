import type { SVGProps } from "react";

/**
 * Icônes de tab bar Apple iOS — tracées à la main pour matcher le mockup
 * (apple-tokens.jsx → TabBar). 26×26 par défaut, stroke-current.
 *
 * Ces icônes remplacent les lucide-react icons (Home, Calendar, GraduationCap,
 * MessageCircle, User) dans BottomNavigation pour un rendu SF-symbols-like.
 *
 * Props : `size` (défaut 26), `strokeWidth` (défaut 1.7 inactive, ~2.2 active)
 */

type Props = SVGProps<SVGSVGElement> & {
  size?: number;
};

function svgProps({ size = 26, strokeWidth = 1.7, ...rest }: Props) {
  return {
    width: size,
    height: size,
    viewBox: `0 0 ${size} ${size}`,
    fill: "none" as const,
    stroke: "currentColor" as const,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
    ...rest,
  };
}

/** Découvrir : compas dans un cercle (mockup tokens.TabBar) */
export function DiscoverIcon(props: Props) {
  return (
    <svg {...svgProps(props)}>
      <circle cx="13" cy="13" r="11" />
      <path d="M8 8l4 6-3 5 5-3 6-4-7 1z" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Mes séances : calendrier avec grid (mockup) */
export function SessionsIcon(props: Props) {
  return (
    <svg {...svgProps(props)}>
      <rect x="3" y="5" width="20" height="18" rx="3" />
      <path d="M3 10h20M8 2v4M18 2v4M8 14h4M8 18h8" />
    </svg>
  );
}

/** Coaching : cercle avec aiguilles (chronomètre — mockup) */
export function CoachingIcon(props: Props) {
  // Léger ajustement : viewBox 28 pour un meilleur centrage du cercle.
  const { size = 26, strokeWidth = 1.7, ...rest } = props;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      <circle cx="14" cy="14" r="12" />
      <path d="M14 6v8l5 3" />
    </svg>
  );
}

/** Messages : bulle avec queue (iMessage — mockup) */
export function MessagesIcon(props: Props) {
  return (
    <svg {...svgProps(props)}>
      <path d="M23 13a9 9 0 1 1-3.5-7.1L23 4l-1.1 4.5A9 9 0 0 1 23 13z" />
    </svg>
  );
}

/** Profil : tête + buste (mockup) */
export function ProfileIcon(props: Props) {
  return (
    <svg {...svgProps(props)}>
      <circle cx="13" cy="9" r="5" />
      <path d="M3 24c2-5.5 6-8 10-8s8 2.5 10 8" />
    </svg>
  );
}
