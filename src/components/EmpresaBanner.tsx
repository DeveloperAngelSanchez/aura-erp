import React from 'react';
import { useEmpresa } from '../context/EmpresaContext';
import { useLanguage } from '../context/LanguageContext';
import { LogOut } from 'lucide-react';

const translations = {
  es: {
    viewing: 'Visualizando',
    exit: 'Salir',
  },
  en: {
    viewing: 'Viewing',
    exit: 'Exit',
  },
};

export const EmpresaBanner: React.FC = () => {
  const { impersonating, activeEmpresaNombre, clearActiveEmpresa } = useEmpresa();
  const { lang } = useLanguage();
  const t = translations[lang];

  if (!impersonating) return null;

  return (
    <div className="bg-blue-600 text-white px-6 py-2 flex items-center justify-between text-xs font-semibold">
      <span>
        {t.viewing}: <span className="font-extrabold">{activeEmpresaNombre}</span>
      </span>
      <button
        onClick={clearActiveEmpresa}
        className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded-lg transition-colors cursor-pointer"
      >
        <LogOut className="w-3 h-3" />
        <span>{t.exit}</span>
      </button>
    </div>
  );
};
