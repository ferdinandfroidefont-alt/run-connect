import type { Language } from './languageCatalog';

/**
 * ISO 3166-1 alpha-2 → langue par défaut (liste pays du formulaire profil + extension).
 */
const MAP: Record<string, Language> = {
  FR: 'fr',
  BE: 'fr',
  CH: 'de',
  CA: 'en',
  LU: 'fr',
  MA: 'ar',
  TN: 'ar',
  SN: 'fr',
  CI: 'fr',
  ES: 'es',
  PT: 'pt',
  DE: 'de',
  IT: 'it',
  GB: 'en',
  US: 'en',
  NL: 'nl',
  PL: 'pl',
  RO: 'ro',
  CZ: 'cs',
  SK: 'sk',
  HU: 'hu',
  SE: 'sv',
  DK: 'da',
  NO: 'nb',
  FI: 'fi',
  GR: 'el',
  TR: 'tr',
  UA: 'uk',
  RU: 'ru',
  SA: 'ar',
  AE: 'ar',
  EG: 'ar',
  IL: 'he',
  IN: 'hi',
  BD: 'bn',
  PK: 'ur',
  IR: 'fa',
  CN: 'zh-CN',
  TW: 'zh-TW',
  HK: 'zh-TW',
  MO: 'zh-TW',
  JP: 'ja',
  KR: 'ko',
  TH: 'th',
  VN: 'vi',
  ID: 'id',
  MY: 'ms',
  PH: 'fil',
  KE: 'sw',
  TZ: 'sw',
  UG: 'sw',
  BR: 'pt',
  AO: 'pt',
  MZ: 'pt',
};

export function getLanguageForCountry(iso2: string | null | undefined): Language | null {
  if (!iso2) return null;
  const k = iso2.toUpperCase();
  return MAP[k] ?? null;
}
