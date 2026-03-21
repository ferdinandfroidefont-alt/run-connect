/**
 * Langues supportées (codes BCP-47 courts).
 * Les langues sans bundle dédié retombent sur l’anglais via deepMerge dans translations.
 */
export const SUPPORTED_LANGUAGE_CODES = [
  'en',
  'fr',
  'es',
  'pt',
  'de',
  'it',
  'nl',
  'pl',
  'ro',
  'cs',
  'sk',
  'hu',
  'sv',
  'da',
  'nb',
  'fi',
  'el',
  'tr',
  'uk',
  'ru',
  'ar',
  'he',
  'hi',
  'bn',
  'ur',
  'fa',
  'zh-CN',
  'zh-TW',
  'ja',
  'ko',
  'th',
  'vi',
  'id',
  'ms',
  'fil',
  'sw',
] as const;

export type Language = (typeof SUPPORTED_LANGUAGE_CODES)[number];

export const LANGUAGE_INFO: Record<Language, { name: string; nativeName: string }> = {
  en: { name: 'English', nativeName: 'English' },
  fr: { name: 'French', nativeName: 'Français' },
  es: { name: 'Spanish', nativeName: 'Español' },
  pt: { name: 'Portuguese', nativeName: 'Português' },
  de: { name: 'German', nativeName: 'Deutsch' },
  it: { name: 'Italian', nativeName: 'Italiano' },
  nl: { name: 'Dutch', nativeName: 'Nederlands' },
  pl: { name: 'Polish', nativeName: 'Polski' },
  ro: { name: 'Romanian', nativeName: 'Română' },
  cs: { name: 'Czech', nativeName: 'Čeština' },
  sk: { name: 'Slovak', nativeName: 'Slovenčina' },
  hu: { name: 'Hungarian', nativeName: 'Magyar' },
  sv: { name: 'Swedish', nativeName: 'Svenska' },
  da: { name: 'Danish', nativeName: 'Dansk' },
  nb: { name: 'Norwegian (Bokmål)', nativeName: 'Norsk bokmål' },
  fi: { name: 'Finnish', nativeName: 'Suomi' },
  el: { name: 'Greek', nativeName: 'Ελληνικά' },
  tr: { name: 'Turkish', nativeName: 'Türkçe' },
  uk: { name: 'Ukrainian', nativeName: 'Українська' },
  ru: { name: 'Russian', nativeName: 'Русский' },
  ar: { name: 'Arabic', nativeName: 'العربية' },
  he: { name: 'Hebrew', nativeName: 'עברית' },
  hi: { name: 'Hindi', nativeName: 'हिन्दी' },
  bn: { name: 'Bengali', nativeName: 'বাংলা' },
  ur: { name: 'Urdu', nativeName: 'اردو' },
  fa: { name: 'Persian', nativeName: 'فارسی' },
  'zh-CN': { name: 'Chinese (Simplified)', nativeName: '简体中文' },
  'zh-TW': { name: 'Chinese (Traditional)', nativeName: '繁體中文' },
  ja: { name: 'Japanese', nativeName: '日本語' },
  ko: { name: 'Korean', nativeName: '한국어' },
  th: { name: 'Thai', nativeName: 'ไทย' },
  vi: { name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  id: { name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  ms: { name: 'Malay', nativeName: 'Bahasa Melayu' },
  fil: { name: 'Filipino', nativeName: 'Filipino' },
  sw: { name: 'Swahili', nativeName: 'Kiswahili' },
};

/** Ordre d’affichage : natif A–Z (approximatif pour scripts mixtes) */
export const LANGUAGES_SORTED: Language[] = [...SUPPORTED_LANGUAGE_CODES].sort((a, b) =>
  LANGUAGE_INFO[a].nativeName.localeCompare(LANGUAGE_INFO[b].nativeName, 'en', { sensitivity: 'base' })
);

export function isSupportedLanguage(code: string): code is Language {
  return (SUPPORTED_LANGUAGE_CODES as readonly string[]).includes(code);
}

/** Normalise les anciens codes stockés (ex. zh → zh-CN). */
export function normalizeLanguageCode(code: string | null | undefined): Language {
  if (!code || typeof code !== 'string') return 'en';
  const trimmed = code.trim();
  if (trimmed === 'zh') return 'zh-CN';
  if (isSupportedLanguage(trimmed)) return trimmed;
  return 'en';
}
