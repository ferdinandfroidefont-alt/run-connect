/** Codes pays du sélecteur profil (ProfileDialog / ProfileSetup). */
export const COUNTRY_LABELS: Record<string, string> = {
  FR: "🇫🇷 France",
  BE: "🇧🇪 Belgique",
  CH: "🇨🇭 Suisse",
  CA: "🇨🇦 Canada",
  LU: "🇱🇺 Luxembourg",
  MA: "🇲🇦 Maroc",
  TN: "🇹🇳 Tunisie",
  DZ: "🇩🇿 Algérie",
  SN: "🇸🇳 Sénégal",
  CI: "🇨🇮 Côte d'Ivoire",
  ES: "🇪🇸 Espagne",
  PT: "🇵🇹 Portugal",
  DE: "🇩🇪 Allemagne",
  IT: "🇮🇹 Italie",
  GB: "🇬🇧 Royaume-Uni",
  US: "🇺🇸 États-Unis",
};

export function getCountryLabel(code: string | null | undefined): string | null {
  if (!code) return null;
  return COUNTRY_LABELS[code] ?? code;
}
