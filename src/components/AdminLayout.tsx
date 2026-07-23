import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { EmpresaBanner } from './EmpresaBanner';
import { NotificationCenter } from './NotificationCenter';
import { ErrorBoundary } from './ErrorBoundary';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Globe, LogOut, Menu } from 'lucide-react';

const translations = {
  es: { logout: 'Cerrar Sesión' },
  en: { logout: 'Log Out' },
};

export const AdminLayout: React.FC = () => {
  const { profile, signOut } = useAuth();
  const { lang, toggleLanguage } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = translations[lang];

  return (
    <div className="flex bg-slate-50 text-slate-800 min-h-screen">
      {/* Sidebar navigation */}
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      {/* Main content wrapper */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <EmpresaBanner />

        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 flex items-center justify-between gap-3 shadow-sm">
          
          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMobileOpen(prev => !prev)}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            title="Menú"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Right Header Actions */}
          <div className="flex items-center justify-end gap-3 ml-auto">
            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 transition-all shadow-sm cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{lang === 'es' ? 'ES' : 'EN'}</span>
            </button>

            {/* Notifications */}
            <NotificationCenter />

            {/* User Info */}
            <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs border border-blue-100 capitalize">
                {profile?.nombre?.substring(0, 2) || 'US'}
              </div>
              <div className="hidden sm:block text-right">
                <p className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[120px]">
                  {profile?.nombre || 'Usuario'}
                </p>
                <p className="text-[10px] text-slate-400 capitalize font-medium leading-tight">
                  {profile?.rol || ''}
                </p>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={signOut}
              className="p-2 hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
              title={t.logout}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 lg:px-12 pb-safe safe-area-padding">
          <div className="max-w-7xl mx-auto space-y-6">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
};
