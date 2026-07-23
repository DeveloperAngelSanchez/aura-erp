import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'es' | 'en';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Detect language from browser locale
  const detectDefaultLanguage = (): Language => {
    const browserLang = navigator.language.split('-')[0];
    return browserLang === 'es' ? 'es' : 'en';
  };

  // Load saved language or fall back to browser default
  const [lang, setLangState] = useState<Language>(() => {
    const savedLang = localStorage.getItem('aura_lang');
    if (savedLang === 'es' || savedLang === 'en') {
      return savedLang;
    }
    return detectDefaultLanguage();
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('aura_lang', newLang);
  };

  const toggleLanguage = () => {
    setLang(lang === 'es' ? 'en' : 'es');
  };

  // Update HTML lang attribute dynamically for accessibility / screen readers
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
