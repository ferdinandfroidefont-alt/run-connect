import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations, Language } from '@/lib/translations';
import { supabase } from '@/integrations/supabase/client';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
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
    return (saved as Language) || 'fr';
  });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadLanguageFromProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('preferred_language')
            .eq('user_id', user.id)
            .maybeSingle() as any;
          
          if (profile?.preferred_language) {
            setLanguageState(profile.preferred_language as Language);
            localStorage.setItem('app-language', profile.preferred_language);
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

  const setLanguage = async (lang: Language) => {
    console.log('🌍 Changement de langue:', language, '→', lang);
    
    // Sauvegarder immédiatement dans localStorage
    localStorage.setItem('app-language', lang);
    
    // Mettre à jour l'état
    setLanguageState(lang);
    
    // Sauvegarder aussi dans la base de données
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await (supabase
          .from('profiles')
          .update({ preferred_language: lang } as any)
          .eq('user_id', user.id));
        console.log('✅ Langue sauvegardée dans le profil');
      }
    } catch (error) {
      console.error('❌ Error saving language to profile:', error);
    }
    
    // Recharger la page pour appliquer les changements
    setTimeout(() => {
      window.location.reload();
    }, 300);
  };

  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[language];
    
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return key;
      }
    }
    
    return typeof value === 'string' ? value : key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
