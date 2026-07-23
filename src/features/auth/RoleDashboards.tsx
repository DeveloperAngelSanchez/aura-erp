import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { AlertCircle, Globe, LogOut } from 'lucide-react';
import { DashboardPage } from '../dashboard/DashboardPage';

const translations = {
  es: {
    logout: 'Cerrar Sesión',
    welcome: 'Bienvenido al panel del sistema',
    adminTitle: 'Panel de Administración General',
    adminSummary: 'Resumen del Sistema',
    adminDesc: 'Este panel está restringido para administradores. Aquí podrás ver reportes, configurar sucursales y personal.',
    todaySales: 'Ventas de Hoy',
    activeTurns: 'Turnos de Caja Activos',
    totalBarbers: 'Total Barberos',
    posTitle: 'Terminal de Punto de Venta (POS)',
    cashTurn: 'Turno de Caja',
    posDesc: 'Panel exclusivo para cajeros y personal de cobros. Aquí podrás abrir turnos y registrar ventas rápidas.',
    noActiveTurn: 'No hay ningún turno de caja abierto para esta sucursal.',
    openTurn: 'Abrir Turno de Caja',
    barberTitle: 'Panel de Barbería y Estilismo',
    attendance: 'Asistencia y Comisiones',
    barberDesc: 'Panel para barberos. Aquí puedes registrar tu asistencia y hacer el seguimiento de tus comisiones del día.',
    accumulatedCommissions: 'Comisiones Acumuladas (Hoy)',
    attendanceRegistry: 'Registro de Asistencia',
    outOfService: 'Fuera de Servicio',
    markEntry: 'Marcar Entrada',
  },
  en: {
    logout: 'Log Out',
    welcome: 'Welcome to the system dashboard',
    adminTitle: 'General Administration Panel',
    adminSummary: 'System Overview',
    adminDesc: 'This panel is restricted to administrators. Here you can view reports, configure branches and staff.',
    todaySales: "Today's Sales",
    activeTurns: 'Active Cash Turns',
    totalBarbers: 'Total Barbers',
    posTitle: 'Point of Sale (POS) Terminal',
    cashTurn: 'Cash Turn',
    posDesc: 'Exclusive panel for cashiers and checkout staff. Here you can open shifts and register quick sales.',
    noActiveTurn: 'There is no open cash turn for this branch.',
    openTurn: 'Open Cash Turn',
    barberTitle: 'Barbershop & Styling Panel',
    attendance: 'Attendance & Commissions',
    barberDesc: 'Panel for barbers. Here you can register your attendance and track your commissions for the day.',
    accumulatedCommissions: 'Accumulated Commissions (Today)',
    attendanceRegistry: 'Attendance Registry',
    outOfService: 'Out of Service',
    markEntry: 'Clock In',
  }
};

const DashboardShell: React.FC<{ title: string; color: string; children: React.ReactNode }> = ({ title, color, children }) => {
  const { profile, signOut } = useAuth();
  const { lang, toggleLanguage } = useLanguage();
  const t = translations[lang];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Aura" className="w-8 h-8 object-contain rounded-lg" />
          <span className="font-extrabold text-lg text-slate-900 tracking-tight">Aura</span>
        </div>
        <div className="flex items-center gap-4">
          {/* Language Switcher */}
          <button
            onClick={toggleLanguage}
            className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{lang === 'es' ? 'ES' : 'EN'}</span>
          </button>
          
          <div className="text-right">
            <p className="text-sm font-bold text-slate-800">{profile?.nombre || 'Usuario'}</p>
            <p className="text-[10px] text-slate-400 capitalize font-medium">{profile?.rol || 'Rol'}</p>
          </div>
          <button
            onClick={signOut}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-rose-600 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t.logout}</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-8 max-w-5xl w-full mx-auto space-y-6">
        <div className={`p-6 rounded-2xl bg-gradient-to-r ${color} shadow-md border border-slate-200/10`}>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">{title}</h1>
          <p className="text-white/80 text-xs font-medium mt-1">
            {t.welcome}, {profile?.nombre}.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          {children}
        </div>
      </main>
    </div>
  );
};

export const AdminDashboard: React.FC = () => {
  return <DashboardPage />;
};

export const POSDashboard: React.FC = () => {
  const { lang } = useLanguage();
  const t = translations[lang];

  return (
    <DashboardShell title={t.posTitle} color="from-emerald-600 to-emerald-700">
      <h2 className="text-base font-bold text-slate-900">{t.cashTurn}</h2>
      <p className="text-xs text-slate-500 leading-relaxed">
        {t.posDesc}
      </p>
      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-center space-y-4 max-w-md mx-auto my-8 shadow-sm">
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
          <AlertCircle className="w-5 h-5" />
        </div>
        <p className="text-xs text-slate-500 font-medium">{t.noActiveTurn}</p>
        <button className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-blue-500/10">
          {t.openTurn}
        </button>
      </div>
    </DashboardShell>
  );
};

import { BarberDashboardPage } from '../barber/BarberDashboardPage';

export const BarberDashboard: React.FC = () => {
  return <BarberDashboardPage />;
};
