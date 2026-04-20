/**
 * Official Strava brand assets per API Brand Guidelines.
 * https://developers.strava.com/guidelines/
 *
 * - "Connect with Strava" button (orange, 48px height)
 * - "Compatible with Strava" / "Powered by Strava" logos
 * - "View on Strava" link helper
 */

function StravaWordmark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Strava"
    >
      <path
        d="M17.2 17.944l-2.089-4.116H12.046L17.2 24l5.15-10.172h-3.066M10.192 12.345l2.836 5.599h4.172L10.192 4l-7 13.944h4.171l2.836-5.599z"
        fill="currentColor"
      />
      <text
        x="30"
        y="18"
        fontFamily="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
        fontSize="15"
        fontWeight="700"
        letterSpacing="0.04em"
        fill="currentColor"
      >
        STRAVA
      </text>
    </svg>
  );
}

/**
 * Official "Connect with Strava" button (orange background, white text).
 * Per guidelines: links to https://www.strava.com/oauth/authorize.
 * Height: 48px at 1x.
 */
export function StravaConnectButton({
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
      className="flex h-12 w-full items-center justify-center gap-2.5 rounded-[6px] bg-[#FC4C02] px-5 text-white transition-colors hover:bg-[#e04400] active:bg-[#c83d00] disabled:opacity-60"
      aria-label="Se connecter avec Strava"
    >
      <svg
        className="h-5 w-5 shrink-0"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.171" />
      </svg>
      <span className="text-[15px] font-semibold leading-none tracking-wide">
        {loading ? "Connexion..." : "Se connecter avec Strava"}
      </span>
    </button>
  );
}

/**
 * "Powered by Strava" / "Compatible with Strava" attribution.
 *
 * Per guidelines:
 * - Must appear where Strava data is displayed.
 * - Must be completely separate and distinct from app branding.
 * - Must not appear more prominently than the app name/logo.
 *
 * variant="logo"  → small inline logo badge
 * variant="text"  → text with Strava icon
 */
export function StravaPoweredBy({
  variant = "logo",
  label = "Compatible avec Strava",
}: {
  variant?: "logo" | "text";
  label?: string;
}) {
  if (variant === "text") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#FC4C02]">
        <svg
          className="h-4 w-4 shrink-0"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.171" />
        </svg>
        {label}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1.5 pt-1">
      <svg
        className="h-3.5 w-3.5 shrink-0 text-[#FC4C02]"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.171" />
      </svg>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}

/**
 * "View on Strava" link per brand guidelines.
 *
 * - Text must be readable.
 * - Must be identifiable as a link: bold, underlined, or orange #FC5200.
 */
export function StravaViewLink({
  href,
  label = "Voir sur Strava",
}: {
  href: string;
  label?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm font-medium text-[#FC4C02] underline decoration-[#FC4C02]/40 underline-offset-2 transition-colors hover:text-[#e04400]"
    >
      <svg
        className="h-3.5 w-3.5 shrink-0"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.171" />
      </svg>
      {label}
    </a>
  );
}
