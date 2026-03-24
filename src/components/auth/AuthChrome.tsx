import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import appIcon from "@/assets/app-icon.png";

/** Fond décoratif discret (écrans pleine hauteur auth). */
export function AuthAmbientBackground() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ opacity: 0.04 }}
      viewBox="0 0 400 800"
      fill="none"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <path
        d="M-50 600 Q100 400 200 500 T450 300 T200 100"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M-50 700 Q150 500 250 600 T500 400 T250 200"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
        fill="none"
      />
    </svg>
  );
}

/** Bloc légal réutilisé (landing + choix connexion). */
export function AuthLegalFooter({ className }: { className?: string }) {
  return (
    <p className={cn("px-4 text-center text-[12px] leading-relaxed text-muted-foreground/70", className)}>
      En continuant, vous acceptez nos{" "}
      <Link to="/terms" className="text-muted-foreground underline underline-offset-2">
        Conditions d&apos;utilisation
      </Link>{" "}
      et notre{" "}
      <Link to="/privacy" className="text-muted-foreground underline underline-offset-2">
        Politique de confidentialité
      </Link>
      .{" "}
      <Link to="/legal" className="text-muted-foreground underline underline-offset-2">
        Mentions légales
      </Link>
      .
    </p>
  );
}

const brandShadow = "0 8px 24px hsl(var(--primary) / 0.18)";

export function AuthBrandMark({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="relative z-10 mb-10 flex flex-col items-center">
      <img
        src={appIcon}
        alt="RunConnect"
        className="mb-5 h-[88px] w-[88px] overflow-hidden rounded-[22px] object-cover"
        style={{ boxShadow: brandShadow }}
      />
      <h1 className="text-[28px] font-bold tracking-tight text-primary">{title}</h1>
      <p className="mt-1.5 text-[15px] font-medium text-muted-foreground">{subtitle}</p>
    </div>
  );
}

/** Ombre carte formulaire cohérente sur /auth */
export const authCardShadowStyle = { boxShadow: "0 1px 3px hsl(0 0% 0% / 0.04)" } as const;

/** Padding bas avec encoche / home indicator */
export const authFormScrollClass =
  "px-4 py-6 space-y-5 pb-[max(4rem,calc(1.5rem+env(safe-area-inset-bottom)))]";

type AuthFlowProgressProps = {
  current: number;
  total: number;
  className?: string;
};

/** Indicateur d’étapes (inscription e-mail). */
export function AuthFlowProgress({ current, total, className }: AuthFlowProgressProps) {
  return (
    <div
      className={cn("mb-1 flex justify-center gap-1.5", className)}
      role="status"
      aria-label={`Étape ${current} sur ${total}`}
    >
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={cn(
            "h-1 w-7 rounded-full transition-colors duration-200 sm:w-8",
            i < current ? "bg-primary" : "bg-border"
          )}
        />
      ))}
    </div>
  );
}
