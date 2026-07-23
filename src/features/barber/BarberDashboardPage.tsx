import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../api/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useSettings } from '../../context/SettingsContext';
import { useEmpresa } from '../../context/EmpresaContext';
import {
  Clock,
  UserCheck,
  Scissors,
  DollarSign,
  Calendar as CalendarIcon,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Globe,
  Award,
  BarChart3,
  CalendarDays,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface AttendanceRecord {
  id: string;
  usuario_id: string;
  sucursal_id: string;
  fecha: string;
  entrada_en: string;
  salida_en: string | null;
}

interface CommissionRecord {
  barbero_id: string;
  barbero_nombre: string;
  venta_id: string;
  venta_fecha: string;
  sucursal_id: string;
  detalle_id: string;
  item_nombre: string;
  cantidad: number;
  precio_unitario: number;
  total_linea: number;
  comision: number;
}

const translations = {
  es: {
    dashboardTitle: 'Panel Inteligente de Barbería',
    attendanceTab: 'Calendario & Asistencias',
    analyticsTab: 'Dashboard & Estadísticas',
    clockIn: 'Marcar Entrada',
    clockOut: 'Marcar Salida',
    onDuty: 'En Servicio',
    offDuty: 'Fuera de Servicio',
    entry: 'Entrada',
    exit: 'Salida',
    duration: 'Duración',
    todayCommissions: 'Comisiones de Hoy',
    monthlyCommissions: 'Comisiones del Mes',
    totalAttentions: 'Atenciones Realizadas',
    topCommissionDay: 'Día Récord',
    tardinessRate: 'Puntualidad',
    weeklyHours: 'Horas esta Semana',
    hoursShort: 'hrs',
    minsShort: 'min',
    noDataDay: 'Sin registros para este día',
    dayDetails: 'Detalle de la Jornada',
    servicesDone: 'Servicios Atendidos',
    confirmClockOut: '¿Deseas marcar la salida de tu turno?',
    logout: 'Cerrar Sesión',
    shiftActive: 'Turno Activo',
    shiftFinished: 'Turno Concluido',
    lateBadge: 'Con Tardanza',
    onTimeBadge: 'Puntual',
    noAttendance: 'Sin Registro',
    confirm: 'Confirmar',
    cancel: 'Cancelar',
  },
  en: {
    dashboardTitle: 'Barbershop Smart Dashboard',
    attendanceTab: 'Calendar & Attendance',
    analyticsTab: 'Dashboard & Analytics',
    clockIn: 'Clock In',
    clockOut: 'Clock Out',
    onDuty: 'On Duty',
    offDuty: 'Off Duty',
    entry: 'Clock In',
    exit: 'Clock Out',
    duration: 'Duration',
    todayCommissions: "Today's Commissions",
    monthlyCommissions: 'Monthly Commissions',
    totalAttentions: 'Attentions Completed',
    topCommissionDay: 'Record Day',
    tardinessRate: 'Punctuality',
    weeklyHours: 'Hours This Week',
    hoursShort: 'hrs',
    minsShort: 'min',
    noDataDay: 'No records for this day',
    dayDetails: 'Shift Day Details',
    servicesDone: 'Services Performed',
    confirmClockOut: 'Are you sure you want to clock out?',
    logout: 'Log Out',
    shiftActive: 'Active Shift',
    shiftFinished: 'Shift Finished',
    lateBadge: 'Late',
    onTimeBadge: 'On Time',
    noAttendance: 'No Record',
    confirm: 'Confirm',
    cancel: 'Cancel',
  },
};

export const BarberDashboardPage: React.FC = () => {
  const { profile, signOut } = useAuth();
  const { lang, toggleLanguage } = useLanguage();
  const { formatMoney } = useSettings();
  const { impersonating, activeBranchIds } = useEmpresa();
  const t = translations[lang];

  const [activeTab, setActiveTab] = useState<'analytics' | 'attendance'>('analytics');
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [commissions, setCommissions] = useState<CommissionRecord[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(new Date().toISOString().split('T')[0]);
  const [showConfirmOut, setShowConfirmOut] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Fetch all barber data
  const fetchData = async () => {
    if (!profile?.id) return;
    try {
      const todayStr = new Date().toISOString().split('T')[0];

      // Fetch Attendance records
      const { data: attData, error: attErr } = await supabase
        .from('asistencia')
        .select('*')
        .eq('usuario_id', profile.id)
        .order('fecha', { ascending: false });

      if (attErr) throw attErr;

      // Fetch Commission records from view
      const { data: commData, error: commErr } = await supabase
        .from('vista_comisiones_barberos')
        .select('*')
        .eq('barbero_id', profile.id)
        .order('venta_fecha', { ascending: false });

      if (commErr) throw commErr;

      const atts: AttendanceRecord[] = attData || [];
      const comms: CommissionRecord[] = commData || [];

      setAttendances(atts);
      setCommissions(comms);

      // Find today's attendance
      const todayRec = atts.find((a) => a.fecha === todayStr) || null;
      setTodayAttendance(todayRec);
    } catch (err: any) {
      console.error('Error fetching barber dashboard data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [profile?.id]);

  // Handle Clock In / Clock Out
  const handleClockIn = async () => {
    if (!profile?.id) return;
    setActionLoading(true);
    setActionMessage(null);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const targetBranchId = impersonating && activeBranchIds.length > 0 ? activeBranchIds[0] : profile.sucursal_id;

      const { error: err } = await supabase.from('asistencia').insert({
        usuario_id: profile.id,
        sucursal_id: targetBranchId,
        fecha: todayStr,
        entrada_en: new Date().toISOString(),
      });

      if (err) throw err;

      setActionMessage({ text: lang === 'es' ? '¡Entrada registrada correctamente!' : 'Clock-in recorded!', type: 'success' });
      await fetchData();
    } catch (err: any) {
      setActionMessage({ text: err.message || (lang === 'es' ? 'Error al marcar entrada' : 'Error clocking in'), type: 'error' });
    } finally {
      setActionLoading(false);
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  const handleClockOut = async () => {
    if (!profile?.id || !todayAttendance) return;
    setActionLoading(true);
    setActionMessage(null);
    try {
      const { error: err } = await supabase
        .from('asistencia')
        .update({ salida_en: new Date().toISOString() })
        .eq('id', todayAttendance.id);

      if (err) throw err;

      setActionMessage({ text: lang === 'es' ? '¡Salida registrada correctamente!' : 'Clock-out recorded!', type: 'success' });
      setShowConfirmOut(false);
      await fetchData();
    } catch (err: any) {
      setActionMessage({ text: err.message || (lang === 'es' ? 'Error al marcar salida' : 'Error clocking out'), type: 'error' });
    } finally {
      setActionLoading(false);
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  // Helper for Shift Duration in Minutes / Hours
  const getShiftDurationMinutes = (entrada: string, salida: string | null) => {
    if (!entrada) return 0;
    const start = new Date(entrada).getTime();
    const end = salida ? new Date(salida).getTime() : new Date().getTime();
    return Math.max(0, Math.floor((end - start) / (1000 * 60)));
  };

  // Check if entry time is considered late (e.g., after 09:15 AM)
  const isLateEntry = (entrada: string) => {
    if (!entrada) return false;
    const d = new Date(entrada);
    const hours = d.getHours();
    const minutes = d.getMinutes();
    return hours > 9 || (hours === 9 && minutes > 15);
  };

  // Compute Metrics & KPI Statistics
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Commissions today
    const commsToday = commissions
      .filter((c) => c.venta_fecha && c.venta_fecha.split('T')[0] === todayStr)
      .reduce((sum, c) => sum + (parseFloat(c.comision?.toString()) || 0), 0);

    // Commissions this month
    const commsMonthRecords = commissions.filter((c) => {
      const d = new Date(c.venta_fecha);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    // Total unique attentions/sales completed this month
    const uniqueSalesMonth = new Set(commsMonthRecords.map((c) => c.venta_id)).size;

    // Peak commission day overall
    const commsByDayMap: Record<string, number> = {};
    commissions.forEach((c) => {
      const dStr = c.venta_fecha ? c.venta_fecha.split('T')[0] : '';
      if (!dStr) return;
      commsByDayMap[dStr] = (commsByDayMap[dStr] || 0) + (parseFloat(c.comision?.toString()) || 0);
    });

    let topDay = { date: '—', amount: 0 };
    Object.entries(commsByDayMap).forEach(([dStr, amount]) => {
      if (amount > topDay.amount) {
        topDay = { date: dStr, amount };
      }
    });

    // Tardiness rate this month
    const attsMonth = attendances.filter((a) => {
      const d = new Date(a.fecha);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const latesCount = attsMonth.filter((a) => isLateEntry(a.entrada_en)).length;
    const punctualityRate = attsMonth.length > 0 ? Math.round(((attsMonth.length - latesCount) / attsMonth.length) * 100) : 100;

    return {
      commsToday,
      uniqueSalesMonth,
      topDay,
      latesCount,
      punctualityRate,
    };
  }, [commissions, attendances]);

  // Chart Data: Weekly Hours vs Commissions (Mon-Sun)
  const weeklyChartData = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);

    const days = [0, 1, 2, 3, 4, 5, 6].map((i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', { weekday: 'short' });

      // Calculate hours for this day
      const att = attendances.find((a) => a.fecha === dStr);
      const mins = att ? getShiftDurationMinutes(att.entrada_en, att.salida_en) : 0;
      const hours = parseFloat((mins / 60).toFixed(1));

      // Calculate commissions for this day
      const comm = commissions
        .filter((c) => c.venta_fecha && c.venta_fecha.split('T')[0] === dStr)
        .reduce((sum, c) => sum + (parseFloat(c.comision?.toString()) || 0), 0);

      return {
        day: label.toUpperCase(),
        date: dStr,
        horas: hours,
        comisiones: parseFloat(comm.toFixed(2)),
      };
    });

    return days;
  }, [attendances, commissions, lang]);

  // Ranking of top services attended by barber
  const topServices = useMemo(() => {
    const map: Record<string, { count: number; totalComm: number }> = {};
    commissions.forEach((c) => {
      const name = c.item_nombre || (lang === 'es' ? 'Servicio General' : 'General Service');
      if (!map[name]) map[name] = { count: 0, totalComm: 0 };
      map[name].count += c.cantidad || 1;
      map[name].totalComm += parseFloat(c.comision?.toString()) || 0;
    });

    return Object.entries(map)
      .map(([name, val]) => ({ name, ...val }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [commissions, lang]);

  // Calendar Days computation for Month Grid
  const calendarGrid = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Monday as start of week (0=Mon, 6=Sun)
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const totalDays = lastDay.getDate();
    const grid: ({ dayNumber: number; dateStr: string; att: AttendanceRecord | null; dayComm: number } | null)[] = [];

    // Empty lead slots
    for (let i = 0; i < startDayOfWeek; i++) {
      grid.push(null);
    }

    for (let d = 1; d <= totalDays; d++) {
      const mStr = String(month + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const dateStr = `${year}-${mStr}-${dStr}`;

      const att = attendances.find((a) => a.fecha === dateStr) || null;
      const dayComm = commissions
        .filter((c) => c.venta_fecha && c.venta_fecha.split('T')[0] === dateStr)
        .reduce((sum, c) => sum + (parseFloat(c.comision?.toString()) || 0), 0);

      grid.push({ dayNumber: d, dateStr, att, dayComm });
    }

    return grid;
  }, [currentDate, attendances, commissions]);

  // Selected Day Detailed Data
  const selectedDayData = useMemo(() => {
    if (!selectedDay) return null;

    const att = attendances.find((a) => a.fecha === selectedDay) || null;
    const commRecords = commissions.filter((c) => c.venta_fecha && c.venta_fecha.split('T')[0] === selectedDay);
    const dayCommTotal = commRecords.reduce((sum, c) => sum + (parseFloat(c.comision?.toString()) || 0), 0);

    let durationStr = '—';
    if (att?.entrada_en) {
      const mins = getShiftDurationMinutes(att.entrada_en, att.salida_en);
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      durationStr = `${h}${t.hoursShort} ${m}${t.minsShort}`;
    }

    return {
      dateStr: selectedDay,
      att,
      commRecords,
      dayCommTotal,
      durationStr,
      isLate: att ? isLateEntry(att.entrada_en) : false,
    };
  }, [selectedDay, attendances, commissions, t]);

  const monthYearLabel = currentDate.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans pb-12">
      {/* ── HEADER ── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Aura" className="w-9 h-9 object-contain rounded-xl" />
            <div>
              <span className="font-black text-slate-900 tracking-tight text-base block leading-none">Aura</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">{lang === 'es' ? 'Panel Barbero' : 'Barber Panel'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span>{lang === 'es' ? 'ES' : 'EN'}</span>
            </button>

            {/* Profile Info */}
            <div className="hidden sm:block text-right pr-1">
              <p className="text-xs font-extrabold text-slate-900 leading-tight">{profile?.nombre || 'Barbero'}</p>
              <p className="text-[10px] text-slate-400 font-medium capitalize">{profile?.rol || 'barbero'}</p>
            </div>

            {/* Sign Out */}
            <button
              onClick={signOut}
              className="p-2 border border-slate-200 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              title={t.logout}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTAINER ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-4 sm:pt-6 space-y-6">
        {/* ── BANNER BIENVENIDA & RELOJ EN VIVO ── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 p-5 sm:p-6 text-white shadow-md">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-md text-[10px] font-extrabold uppercase tracking-wider text-purple-100">
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>{lang === 'es' ? 'Panel Inteligente' : 'Smart Panel'}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">{t.dashboardTitle}</h1>
              <p className="text-white/80 text-xs font-medium">
                {lang === 'es'
                  ? `Bienvenido, ${profile?.nombre || 'Barbero'}. Gestiona tus turnos, comisiones y seguimiento diario.`
                  : `Welcome, ${profile?.nombre || 'Barber'}. Track your shift, commissions, and daily metrics.`}
              </p>
            </div>

            {/* Clock Widget Card */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-xl flex items-center justify-between md:justify-end gap-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${todayAttendance && !todayAttendance.salida_en ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
                  <span className="text-xs font-extrabold tracking-tight">
                    {todayAttendance && !todayAttendance.salida_en ? t.onDuty : t.offDuty}
                  </span>
                </div>
                {todayAttendance?.entrada_en && (
                  <p className="text-[11px] text-white/80 font-mono font-medium">
                    {t.entry}: {new Date(todayAttendance.entrada_en).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>

              <div>
                {!todayAttendance ? (
                  <button
                    onClick={handleClockIn}
                    disabled={actionLoading}
                    className="px-4 py-2.5 bg-white text-purple-700 hover:bg-purple-50 font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <Clock className="w-4 h-4 text-purple-600" />
                    <span>{t.clockIn}</span>
                  </button>
                ) : !todayAttendance.salida_en ? (
                  <button
                    onClick={() => setShowConfirmOut(true)}
                    disabled={actionLoading}
                    className="px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{t.clockOut}</span>
                  </button>
                ) : (
                  <span className="px-3 py-1.5 bg-emerald-500/30 border border-emerald-300/30 text-emerald-100 rounded-xl text-xs font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{t.shiftFinished}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Message Banner */}
        {actionMessage && (
          <div
            className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs border ${
              actionMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {actionMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span>{actionMessage.text}</span>
          </div>
        )}

        {/* ── MOBILE SEGMENTED TABS (RESPONSIVE) ── */}
        <div className="flex bg-slate-200/70 p-1 rounded-2xl max-w-md mx-auto sm:mx-0 shadow-inner">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'analytics' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-purple-600" />
            <span>{t.analyticsTab}</span>
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'attendance' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarDays className="w-4 h-4 text-blue-600" />
            <span>{t.attendanceTab}</span>
          </button>
        </div>

        {/* ── TAB 1: DASHBOARD & ANALYTICS ── */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* 4 KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Comisiones Hoy */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t.todayCommissions}</span>
                  <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">{formatMoney(stats.commsToday)}</span>
                  <span className="text-[10px] text-emerald-600 font-bold block">{lang === 'es' ? 'Ingreso directo acumulado' : 'Direct earnings today'}</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-xs">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>

              {/* Card 2: Atenciones Realizadas */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t.totalAttentions}</span>
                  <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">{stats.uniqueSalesMonth}</span>
                  <span className="text-[10px] text-purple-600 font-bold block">{lang === 'es' ? 'Servicios en el mes' : 'Services this month'}</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shadow-xs">
                  <Scissors className="w-6 h-6" />
                </div>
              </div>

              {/* Card 3: Día Récord de Comisión */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t.topCommissionDay}</span>
                  <span className="text-xl font-black text-slate-900 font-mono tracking-tight">
                    {stats.topDay.amount > 0 ? formatMoney(stats.topDay.amount) : '—'}
                  </span>
                  <span className="text-[10px] text-blue-600 font-bold block truncate max-w-[120px]">
                    {stats.topDay.date !== '—' ? stats.topDay.date : (lang === 'es' ? 'Sin récord registrado' : 'No record yet')}
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
                  <Award className="w-6 h-6" />
                </div>
              </div>

              {/* Card 4: Puntualidad & Tardanzas */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t.tardinessRate}</span>
                  <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">{stats.punctualityRate}%</span>
                  <span className={`text-[10px] font-bold block ${stats.latesCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {stats.latesCount > 0
                      ? `${stats.latesCount} ${lang === 'es' ? 'tardanza(s) este mes' : 'late shift(s)'}`
                      : (lang === 'es' ? 'Excelente puntualidad' : 'Perfect attendance')}
                  </span>
                </div>
                <div
                  className={`w-12 h-12 rounded-2xl border flex items-center justify-center shadow-xs ${
                    stats.latesCount > 0 ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                  }`}
                >
                  <UserCheck className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Main Analytics Grid (Charts & Rankings) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Weekly Hours & Commissions Chart (2 Cols) */}
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                      {lang === 'es' ? 'Reporte Semanal: Horas de Turno vs Comisiones' : 'Weekly Report: Shift Hours vs Commissions'}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                      {lang === 'es' ? 'Compara la duración de tus jornadas con tus ganancias diarias.' : 'Compare your shift duration against daily earnings.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] font-bold">
                    <span className="flex items-center gap-1.5 text-purple-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block"></span>
                      <span>Comisiones (S/.)</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-blue-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span>
                      <span>Horas ({t.hoursShort})</span>
                    </span>
                  </div>
                </div>

                <div className="h-64 sm:h-72 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11, fontWeight: 700 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          borderRadius: '12px',
                          border: '1 border-slate-200',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                          fontSize: '12px',
                          fontWeight: '700',
                        }}
                      />
                      <Bar dataKey="comisiones" fill="#9333EA" radius={[6, 6, 0, 0]} name={lang === 'es' ? 'Comisión (S/.)' : 'Commission ($)'} />
                      <Bar dataKey="horas" fill="#2563EB" radius={[6, 6, 0, 0]} name={lang === 'es' ? 'Horas de Turno' : 'Shift Hours'} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Ranking of Top Services (1 Col) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 flex flex-col justify-between">
                <div>
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                      {lang === 'es' ? 'Top Servicios Realizados' : 'Top Services Performed'}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                      {lang === 'es' ? 'Servicios con mayor demanda' : 'Most attended services'}
                    </p>
                  </div>

                  <div className="space-y-4 pt-4">
                    {topServices.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs italic">
                        {lang === 'es' ? 'Sin datos de servicios aún.' : 'No service data available yet.'}
                      </div>
                    ) : (
                      topServices.map((srv, idx) => (
                        <div key={idx} className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs font-bold">
                            <span className="text-slate-800 truncate max-w-[150px]">{srv.name}</span>
                            <span className="font-mono text-purple-600">{formatMoney(srv.totalComm)}</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-purple-600 h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, (srv.count / (topServices[0]?.count || 1)) * 100)}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                            <span>
                              {srv.count} {lang === 'es' ? 'atenciones' : 'attentions'}
                            </span>
                            <span>{Math.round((srv.count / (topServices[0]?.count || 1)) * 100)}%</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl text-[11px] text-slate-600 flex items-start gap-2">
                  <Info className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                  <span>
                    {lang === 'es'
                      ? 'Tus comisiones se acumulan automáticamente con cada venta cobrada en caja.'
                      : 'Your commissions accumulate automatically with every checkout.'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: CALENDARIO & ASISTENCIAS ── */}
        {activeTab === 'attendance' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Monthly Calendar Grid (2 Cols) */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
              {/* Month Navigation */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-blue-600" />
                  <h3 className="text-base font-extrabold text-slate-900 capitalize">{monthYearLabel}</h3>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                    className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition-all cursor-pointer shadow-xs"
                    title={lang === 'es' ? 'Mes Anterior' : 'Previous Month'}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentDate(new Date())}
                    className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 transition-all cursor-pointer shadow-xs"
                  >
                    {lang === 'es' ? 'Hoy' : 'Today'}
                  </button>
                  <button
                    onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                    className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition-all cursor-pointer shadow-xs"
                    title={lang === 'es' ? 'Mes Siguiente' : 'Next Month'}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Day Headers (Mon-Sun) */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center">
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d, i) => (
                  <div key={i} className="text-[11px] font-black uppercase text-slate-400 py-1 tracking-wider">
                    {d}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {calendarGrid.map((item, idx) => {
                  if (!item) {
                    return <div key={idx} className="h-14 sm:h-20 bg-slate-50/40 rounded-xl border border-slate-100/50"></div>;
                  }

                  const { dayNumber, dateStr, att, dayComm } = item;
                  const isSelected = selectedDay === dateStr;
                  const isToday = dateStr === new Date().toISOString().split('T')[0];
                  const isLate = att ? isLateEntry(att.entrada_en) : false;

                  return (
                    <div
                      key={dateStr}
                      onClick={() => setSelectedDay(dateStr)}
                      className={`min-h-[58px] sm:h-20 p-1 sm:p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between select-none overflow-hidden ${
                        isSelected
                          ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-500/20 shadow-sm'
                          : isToday
                          ? 'bg-blue-50/50 border-blue-400'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[11px] sm:text-xs font-mono font-bold ${isToday ? 'text-blue-700 font-extrabold' : 'text-slate-700'}`}>
                          {dayNumber}
                        </span>

                        {att && (
                          <span
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              isLate ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            title={isLate ? t.lateBadge : t.onTimeBadge}
                          ></span>
                        )}
                      </div>

                      <div className="space-y-0.5 text-right w-full overflow-hidden">
                        {dayComm > 0 && (
                          <span className="block font-mono font-black text-emerald-600 bg-emerald-50 rounded border border-emerald-100/80 px-0.5 sm:px-1 truncate leading-tight text-[8px] sm:text-[10px]">
                            <span className="sm:hidden">S/{Math.round(dayComm)}</span>
                            <span className="hidden sm:inline">{formatMoney(dayComm)}</span>
                          </span>
                        )}
                        {att && (
                          <span className={`hidden sm:block text-[8px] font-bold uppercase tracking-wider truncate ${isLate ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {isLate ? t.lateBadge : t.onTimeBadge}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legend Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-[11px] font-medium text-slate-500 border-t border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span>{t.onTimeBadge}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span>{t.lateBadge}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
                    <span>{t.noAttendance}</span>
                  </span>
                </div>
                <span className="text-[10px] italic">{lang === 'es' ? 'Haz clic en un día para ver detalles' : 'Click on any day for details'}</span>
              </div>
            </div>

            {/* Selected Day Details Panel (1 Col) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5 flex flex-col justify-between">
              <div>
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                    <Info className="w-4 h-4 text-purple-600" />
                    <span>{t.dayDetails}</span>
                  </h3>
                  {selectedDay && (
                    <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                      {selectedDay}
                    </span>
                  )}
                </div>

                {!selectedDayData ? (
                  <div className="py-16 text-center text-slate-400 text-xs italic space-y-2">
                    <CalendarIcon className="w-8 h-8 mx-auto text-slate-300" />
                    <p>{lang === 'es' ? 'Selecciona un día en el calendario para consultar su desglose.' : 'Select a date on the calendar to view details.'}</p>
                  </div>
                ) : (
                  <div className="space-y-5 pt-4 animate-in fade-in duration-200">
                    {/* Shift Attendance Info */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">{lang === 'es' ? 'Jornada Laboral' : 'Shift Attendance'}</span>
                        {selectedDayData.att ? (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                              selectedDayData.isLate
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {selectedDayData.isLate ? t.lateBadge : t.onTimeBadge}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">{t.noAttendance}</span>
                        )}
                      </div>

                      {selectedDayData.att ? (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                            <span className="text-[10px] text-slate-400 block font-bold uppercase">{t.entry}</span>
                            <span className="font-mono font-bold text-slate-800">
                              {new Date(selectedDayData.att.entrada_en).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                            <span className="text-[10px] text-slate-400 block font-bold uppercase">{t.exit}</span>
                            <span className="font-mono font-bold text-slate-800">
                              {selectedDayData.att.salida_en
                                ? new Date(selectedDayData.att.salida_en).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
                                : '—'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">{t.noDataDay}</p>
                      )}

                      {selectedDayData.att && (
                        <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200/60">
                          <span className="text-slate-500 font-medium">{t.duration}</span>
                          <span className="font-mono font-extrabold text-slate-900">{selectedDayData.durationStr}</span>
                        </div>
                      )}
                    </div>

                    {/* Day Commissions Total */}
                    <div className="bg-purple-50/70 border border-purple-200/80 rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">
                          {lang === 'es' ? 'Comisión Total del Día' : 'Day Total Commission'}
                        </span>
                        <span className="text-xl font-black text-purple-900 font-mono tracking-tight">
                          {formatMoney(selectedDayData.dayCommTotal)}
                        </span>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white font-bold shadow-xs">
                        <DollarSign className="w-5 h-5" />
                      </div>
                    </div>

                    {/* Services Breakdown List */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Scissors className="w-3.5 h-3.5 text-purple-600" />
                        <span>{t.servicesDone} ({selectedDayData.commRecords.length})</span>
                      </h4>

                      {selectedDayData.commRecords.length === 0 ? (
                        <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                          {lang === 'es' ? 'Sin servicios registrados en esta fecha.' : 'No services recorded for this date.'}
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {selectedDayData.commRecords.map((r, i) => (
                            <div key={i} className="bg-white border border-slate-200 p-2.5 rounded-xl flex items-center justify-between text-xs shadow-xs">
                              <div>
                                <span className="font-bold text-slate-800 block truncate max-w-[140px]">{r.item_nombre}</span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {new Date(r.venta_fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <span className="font-mono font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                +{formatMoney(r.comision)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100">
                <button
                  onClick={() => setSelectedDay(new Date().toISOString().split('T')[0])}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all cursor-pointer"
                >
                  {lang === 'es' ? 'Ver Día de Hoy' : 'View Today'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── MODAL DE CONFIRMACIÓN DE MARCAR SALIDA ── */}
      {showConfirmOut && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto text-rose-600">
              <LogOut className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-900">{t.clockOut}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{t.confirmClockOut}</p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowConfirmOut(false)}
                className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleClockOut}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-500/10 transition-all cursor-pointer"
              >
                {actionLoading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block"></span>
                ) : (
                  t.confirm
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
