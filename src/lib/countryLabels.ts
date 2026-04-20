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

/** Sépare « 🇫🇷 » et « France » depuis le libellé complet. */
export function splitCountryLabel(code: string | null | undefined): { flag: string; name: string } | null {
  const full = getCountryLabel(code);
  if (!full) return null;
  const idx = full.indexOf(' ');
  if (idx <= 0) return { flag: full, name: '' };
  return { flag: full.slice(0, idx).trim(), name: full.slice(idx + 1).trim() };
}

/**
 * Ligne lieu pour la carte de partage : « Ville, 🇫🇷 » ou « France, 🇫🇷 » si pas de ville.
 * Pas de code ISO type « FR ».
 */
export function formatProfileShareLocationRow(
  city: string | null | undefined,
  country: string | null | undefined
): string {
  const trimmedCity = city?.trim();
  const parts = splitCountryLabel(country);
  const flag = parts?.flag ?? '';
  const countryName = parts?.name ?? '';

  if (trimmedCity && flag) return `${trimmedCity}, ${flag}`;
  if (trimmedCity) return trimmedCity;
  if (countryName && flag) return `${countryName}, ${flag}`;
  if (flag) return flag;
  if (countryName) return countryName;
  return 'RunConnect';
}
