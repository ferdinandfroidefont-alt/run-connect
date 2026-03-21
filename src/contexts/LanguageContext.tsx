import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { translations, Language, normalizeLanguageCode } from '@/lib/translations';
import { getLanguageForCountry } from '@/lib/i18n/countryLanguage';
import { supabase } from '@/integrations/supabase/client';

const MANUAL_LS_KEY = 'app-language-manually-set';

function getNestedString(obj: unknown, keys: string[]): string | undefined {
  let v: unknown = obj;
  for (const k of keys) {
    if (v && typeof v === 'object' && k in (v as object)) {
      v = (v as Record<string, unknown>)[k];
    } else {
      return undefined;
    }
  }
  return typeof v === 'string' ? v : undefined;
}

export type SetLanguageOptions = {
  /** Si true (défaut), le choix utilisateur prime et bloque la suggestion pays. */
  manual?: boolean;
};

interface LanguageContextType {
  language: Language;
  languageManuallySet: boolean;
  setLanguage: (lang: Language, options?: SetLanguageOptions) => Promise<void>;
  suggestLanguageFromCountry: (iso2: string | null | undefined) => Promise<void>;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider = ({ children }: LanguageProviderProps) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('app-language');
    if (saved) return normalizeLanguageCode(saved);
    return 'fr';
  });
  const [languageManuallySet, setLanguageManuallySet] = useState(
    () => localStorage.getItem(MANUAL_LS_KEY) === 'true'
  );
  const [isLoaded, setIsLoaded] = useState(false);

  const languageManuallySetRef = useRef(languageManuallySet);
  useEffect(() => {
    languageManuallySetRef.current = languageManuallySet;
  }, [languageManuallySet]);

  useEffect(() => {
    const loadLanguageFromProfile = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('preferred_language, language_manually_set')
            .eq('user_id', user.id)
            .maybeSingle();

          if (profile) {
            const row = profile as {
              preferred_language?: string | null;
              language_manually_set?: boolean | null;
            };
            if (typeof row.language_manually_set === 'boolean') {
              setLanguageManuallySet(row.language_manually_set);
              localStorage.setItem(MANUAL_LS_KEY, row.language_manually_set ? 'true' : 'false');
            }
            if (row.preferred_language) {
              const norm = normalizeLanguageCode(row.preferred_language);
              setLanguageState(norm);
              localStorage.setItem('app-language', norm);
            }
          }
        }
      } catch (error) {
        console.error('Error loading language from profile:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadLanguageFromProfile();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('app-language', language);
    }
  }, [language, isLoaded]);

  const persistManualFlag = useCallback(async (manual: boolean) => {
    setLanguageManuallySet(manual);
    languageManuallySetRef.current = manual;
    localStorage.setItem(MANUAL_LS_KEY, manual ? 'true' : 'false');
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ language_manually_set: manual } as Record<string, unknown>)
          .eq('user_id', user.id);
      }
    } catch (error) {
      console.error('Error saving language_manually_set:', error);
    }
  }, []);

  const setLanguage = async (lang: Language, options?: SetLanguageOptions) => {
    const manual = options?.manual ?? true;
    const normalized = normalizeLanguageCode(lang);

    localStorage.setItem('app-language', normalized);
    setLanguageState(normalized);

    if (manual) {
      await persistManualFlag(true);
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ preferred_language: normalized } as Record<string, unknown>)
          .eq('user_id', user.id);
      }
    } catch (error) {
      console.error('Error saving language to profile:', error);
    }
  };

  const suggestLanguageFromCountry = useCallback(async (iso2: string | null | undefined) => {
    if (languageManuallySetRef.current) return;
    const suggested = getLanguageForCountry(iso2);
    if (!suggested) return;

    localStorage.setItem('app-language', suggested);
    setLanguageState(suggested);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ preferred_language: suggested } as Record<string, unknown>)
          .eq('user_id', user.id);
      }
    } catch (error) {
      console.error('Error applying suggested language from country:', error);
    }
  }, []);

  const t = useCallback(
    (key: string): string => {
      const keys = key.split('.');
      const fromCurrent = getNestedString(translations[language], keys);
      if (fromCurrent !== undefined) return fromCurrent;
      const fromEn = getNestedString(translations.en, keys);
      if (fromEn !== undefined) return fromEn;
      return key;
    },
    [language]
  );

  return (
    <LanguageContext.Provider
      value={{
        language,
        languageManuallySet,
        setLanguage,
        suggestLanguageFromCountry,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};
