/**
 * Éléments de marque Instagram pour la connexion OAuth (API Instagram).
 * S’inspire de la structure StravaBrand : bouton dédié, attribution visible, lien profil.
 *
 * Références : politique et ressources Meta / Instagram pour développeurs
 * (logo reconnaissable, pas de déformation, attribution claire auprès des utilisateurs).
 */

import { useId } from "react";

/** Glyphe Instagram (dégradé type marque), sans altération des proportions générales. */
export function InstagramGlyph({ className }: { className?: string }) {
  const raw = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const gid = `igg-${raw}`;

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gid} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FD5949" />
          <stop offset="50%" stopColor="#D6249F" />
          <stop offset="100%" stopColor="#285AEB" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" stroke={`url(#${gid})`} strokeWidth="2" fill="none" />
      <circle cx="12" cy="12" r="4.25" stroke={`url(#${gid})`} strokeWidth="2" fill="none" />
      <circle cx="17.5" cy="6.5" r="1.25" fill={`url(#${gid})`} />
    </svg>
  );
}

/**
 * Bouton principal « Se connecter avec Instagram ».
 * Style distinct du CTA Strava : fond clair + bordure (usage courant pour les login sociaux Meta).
 * Hauteur ~48px comme le bouton Strava.
 */
export function InstagramConnectButton({
  onClick,
  loading = false,
}: {
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      className="flex h-12 w-full items-center justify-center gap-2.5 rounded-[6px] border border-[#DBDBDB] bg-white px-4 text-[#262626] shadow-sm transition-colors hover:bg-[#FAFAFA] active:bg-[#F0F0F0] disabled:opacity-60 dark:border-border dark:bg-card dark:text-foreground dark:hover:bg-secondary/80"
      aria-label="Se connecter avec Instagram"
    >
      <InstagramGlyph className="h-6 w-6 shrink-0" />
      <span className="text-[15px] font-semibold leading-none tracking-tight">
        {loading ? "Connexion…" : "Se connecter avec Instagram"}
      </span>
    </button>
  );
}

/**
 * Attribution : indiquer clairement la provenance du service Instagram (exigence type « powered by »).
 */
export function InstagramPoweredBy({
  variant = "logo",
  label = "Fourni par Instagram",
}: {
  variant?: "logo" | "text";
  label?: string;
}) {
  if (variant === "text") {
    return (
      <span className="inline-flex items-center gap-2 text-[14px] font-semibold text-foreground">
        <InstagramGlyph className="h-5 w-5 shrink-0" />
        <span className="min-w-0">
          {label}
          <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
            Instagram est une marque déposée de Meta.
          </span>
        </span>
      </span>
    );
  }

  return (
    <div className="flex items-start gap-2 pt-1">
      <InstagramGlyph className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span className="text-[11px] leading-snug text-muted-foreground">
        {label}. Instagram est une marque déposée de Meta. Les données Instagram sont traitées selon les règles
        d’Instagram et de votre compte RunConnect.
      </span>
    </div>
  );
}

/** Lien vers le profil public Instagram (@username). */
export function InstagramProfileLink({
  username,
  label = "Voir sur Instagram",
}: {
  username: string;
  label?: string;
}) {
  const u = username.replace(/^@/, "");
  if (!u) return null;
  return (
    <a
      href={`https://www.instagram.com/${encodeURIComponent(u)}/`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#E1306C] underline decoration-[#E1306C]/40 underline-offset-2 transition-colors hover:text-[#c42a5e]"
    >
      <InstagramGlyph className="h-3.5 w-3.5 shrink-0" />
      {label}
    </a>
  );
}
