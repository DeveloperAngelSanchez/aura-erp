import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useSettings } from '../../context/SettingsContext';
import { useEmpresa } from '../../context/EmpresaContext';
import { loadDashboard, type DashboardData, type DateRange } from './dashboardService';
import { DateRangeModal } from './DateRangeModal';
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Ticket,
  Award,
  Calendar,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';

const translations = {
  es: {
    welcome: 'Bienvenido de vuelta',
    subtitle: 'Resumen operativo del sistema',
    totalSales: 'Total de Ventas',
    salesCount: 'Ventas Registradas',
    activeTurns: 'Turnos Activos',
    avgTicket: 'Ticket Promedio',
    bestSeller: 'Más Vendido',
    salesByDay: 'Ventas por Día',
    salesByWeek: 'Ventas por Semana',
    paymentMethods: 'Métodos de Pago',
    revenueVsCommissions: 'Ingresos vs Comisiones',
    topServices: 'Servicios Más Vendidos',
    recentActivity: 'Actividad Reciente',
    ticketId: 'Ticket',
    cashier: 'Cajero',
    client: 'Cliente',
    total: 'Total',
    loading: 'Cargando dashboard...',
    items: 'items',
    noData: 'Sin datos en este período',
    salesWord: 'ventas',
    filterTitle: 'Filtrar por rango de fechas',
  },
  en: {
    welcome: 'Welcome back',
    subtitle: 'System operational overview',
    totalSales: 'Total Sales',
    salesCount: 'Sales Count',
    activeTurns: 'Active Turns',
    avgTicket: 'Avg Ticket',
    bestSeller: 'Best Seller',
    salesByDay: 'Sales by Day',
    salesByWeek: 'Sales by Week',
    paymentMethods: 'Payment Methods',
    revenueVsCommissions: 'Revenue vs Commissions',
    topServices: 'Top Services',
    recentActivity: 'Recent Activity',
    ticketId: 'Ticket',
    cashier: 'Cashier',
    client: 'Client',
    total: 'Total',
    loading: 'Loading dashboard...',
    items: 'items',
    noData: 'No data in this period',
    salesWord: 'sales',
    filterTitle: 'Filter by date range',
  },
};

const methodLabels: Record<string, string> = {
  efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia', mixto: 'Mixto',
};

const methodColors: Record<string, string> = {
  efectivo: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  tarjeta: 'bg-blue-50 text-blue-700 border-blue-200',
  transferencia: 'bg-purple-50 text-purple-700 border-purple-200',
  mixto: 'bg-amber-50 text-amber-700 border-amber-200',
};

const getTodayRange = (): DateRange => {
  const now = new Date();
  const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return { from: iso, to: iso };
};

const formatRangeLabel = (range: DateRange, lang: string) => {
  const fmt = (iso: string) => {
    const d = new Date(`${iso}T00:00:00`);
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  const isToday = getTodayRange().from === range.from && getTodayRange().to === range.to;
  if (isToday) return lang === 'es' ? 'Hoy' : 'Today';
  return `${fmt(range.from)} – ${fmt(range.to)}`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-xs">
        <p className="font-bold text-slate-700 mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }} className="font-semibold">
            {p.name}: ${p.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const KpiCard: React.FC<{
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  accent: string;
  loading?: boolean;
  isText?: boolean;
}> = ({ label, value, icon, color, accent, loading, isText }) => (
  <div className={`bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:shadow-sm transition-all duration-200 group flex flex-col justify-between h-[112px] overflow-hidden ${loading ? 'animate-pulse' : ''}`}>
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">{label}</span>
      <div className={`w-8 h-8 rounded-xl ${color} flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 duration-200`}>
        {icon}
      </div>
    </div>
    {isText ? (
      <p className={`text-xs sm:text-sm font-extrabold ${accent} leading-tight line-clamp-2 my-auto tracking-tight`} title={value}>
        {loading ? '---' : value}
      </p>
    ) : (
      <p className={`text-xl sm:text-2xl font-black ${accent} font-mono tracking-tight truncate`}>
        {loading ? '---' : value}
      </p>
    )}
  </div>
);

export const DashboardPage: React.FC = () => {
  const { profile } = useAuth();
  const { lang } = useLanguage();
  const { formatMoney } = useSettings();
  const { impersonating, activeBranchIds } = useEmpresa();
  const t = translations[lang];

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<DateRange>(getTodayRange());
  const [rangeModalOpen, setRangeModalOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const branchIds = impersonating ? activeBranchIds : [profile?.sucursal_id].filter(Boolean) as string[];
        if (branchIds.length === 0) return;
        const result = await loadDashboard(branchIds, range);
        setData(result);
      } catch (err) {
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [profile?.sucursal_id, range.from, range.to]);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            {t.welcome}, {profile?.nombre?.split(' ')[0] || 'Admin'}
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-0.5">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRangeModalOpen(true)}
            title={t.filterTitle}
            className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center shadow-2xs ${
              loading ? 'bg-slate-50 text-slate-400 border-slate-200' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'
            }`}
          >
            <Calendar className="w-4 h-4" />
          </button>
          <div className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border flex items-center gap-1.5 ${loading ? 'bg-slate-50 text-slate-400 border-slate-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
            {loading
              ? (lang === 'es' ? 'Cargando...' : 'Loading...')
              : (
                <>
                  <span>{data?.salesCount ?? 0} {t.salesWord}</span>
                  <span className={`font-semibold ${loading ? '' : 'text-emerald-600/80'}`}>· {formatRangeLabel(range, lang)}</span>
                </>
              )}
          </div>
        </div>
      </div>

      {/* KPI Cards Grid with Fixed 112px Height */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard
          label={t.totalSales}
          value={formatMoney(data?.totalSales ?? 0)}
          icon={<DollarSign className="w-4 h-4 text-emerald-600" />}
          color="bg-emerald-50"
          accent="text-emerald-700"
          loading={loading}
        />
        <KpiCard
          label={t.salesCount}
          value={String(data?.salesCount ?? 0)}
          icon={<TrendingUp className="w-4 h-4 text-blue-600" />}
          color="bg-blue-50"
          accent="text-blue-700"
          loading={loading}
        />
        <KpiCard
          label={t.activeTurns}
          value={String(data?.activeTurns ?? 0)}
          icon={<ShoppingBag className="w-4 h-4 text-amber-600" />}
          color="bg-amber-50"
          accent="text-amber-700"
          loading={loading}
        />
        <KpiCard
          label={t.avgTicket}
          value={formatMoney(data?.avgTicket ?? 0)}
          icon={<Ticket className="w-4 h-4 text-cyan-600" />}
          color="bg-cyan-50"
          accent="text-cyan-700"
          loading={loading}
        />
        <KpiCard
          label={t.bestSeller}
          value={data?.topServices[0]?.name || (loading ? '---' : '—')}
          icon={<Award className="w-4 h-4 text-purple-600" />}
          color="bg-purple-50"
          accent="text-purple-700"
          loading={loading}
          isText={true}
        />
      </div>

      {/* Charts Row 1 - Weekly Sales + Top Services */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Weekly Sales BarChart */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-5 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            {data?.granularity === 'weekly' ? t.salesByWeek : t.salesByDay}
          </h3>
          {loading ? (
            <div className="h-56 bg-slate-50 rounded-lg animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data?.salesSeries || []} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total" radius={[6, 6, 0, 0]} fill="#3b82f6" maxBarSize={40}>
                  {data?.salesSeries.map((_, i) => (
                    <Cell key={i} fill={i === data.salesSeries.length - 1 ? '#2563eb' : '#93c5fd'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Services (Servicios Más Vendidos) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-5 flex items-center gap-2">
            <Award className="w-4 h-4 text-purple-500" />
            {t.topServices}
          </h3>
          {loading ? (
            <div className="h-56 bg-slate-50 rounded-lg animate-pulse" />
          ) : (
            <div className="space-y-3.5 my-auto">
              {(data?.topServices.length ?? 0) > 0 ? data!.topServices.map((s, i) => {
                const maxCantidad = Math.max(...data!.topServices.map(x => x.cantidad));
                const pct = (s.cantidad / maxCantidad) * 100;
                return (
                  <div key={s.name} className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-slate-400 w-4 text-right shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-xs font-semibold text-slate-800 truncate">{s.name}</p>
                        <span className="text-[10px] font-bold text-slate-500 ml-2 shrink-0">{s.cantidad}x</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            background: `linear-gradient(90deg, #a78bfa, #7c3aed)`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <p className="text-xs text-slate-400 italic text-center py-8">{t.noData}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2 - Revenue vs Commissions + Payment Methods */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Revenue vs Commissions AreaChart */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-5 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            {t.revenueVsCommissions}
          </h3>
          {loading ? (
            <div className="h-52 bg-slate-50 rounded-lg animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data?.revenueVsCommissions || []} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                <defs>
                  <linearGradient id="ingresosGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="comisionesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="ingresos" stroke="#3b82f6" strokeWidth={2} fill="url(#ingresosGrad)" name="Ingresos" />
                <Area type="monotone" dataKey="comisiones" stroke="#f59e0b" strokeWidth={2} fill="url(#comisionesGrad)" name="Comisiones" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Payment Methods Donut */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            {t.paymentMethods}
          </h3>
          {loading ? (
            <div className="h-52 bg-slate-50 rounded-lg animate-pulse" />
          ) : (
            <div className="flex flex-col items-center justify-center my-auto">
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie
                    data={data?.paymentMethods || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {(data?.paymentMethods || []).map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="white" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2.5 mt-1 justify-center">
                {(data?.paymentMethods || []).map((m, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-600">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                    <span>{m.name}</span>
                    <span className="text-slate-400">({Math.round(m.value / (data?.paymentMethods.reduce((a, b) => a + b.value, 0) || 1) * 100)}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t.recentActivity}</h3>
          <span className="text-[10px] text-slate-400 font-medium">
            {data?.recentSales.length || 0} {t.items}
          </span>
        </div>
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin inline-block mr-2 align-middle" />
            {t.loading}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-6 py-3 font-bold text-slate-400 uppercase tracking-wider">{t.ticketId}</th>
                  <th className="text-left px-6 py-3 font-bold text-slate-400 uppercase tracking-wider">{t.cashier}</th>
                  <th className="text-left px-6 py-3 font-bold text-slate-400 uppercase tracking-wider">{t.client}</th>
                  <th className="text-left px-6 py-3 font-bold text-slate-400 uppercase tracking-wider">Pago</th>
                  <th className="text-right px-6 py-3 font-bold text-slate-400 uppercase tracking-wider">{t.total}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.recentSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3 font-mono font-bold text-slate-800">
                      #{sale.correlativo ? sale.correlativo.toString().padStart(8, '0') : sale.id.slice(-8).toUpperCase()}
                    </td>
                    <td className="px-6 py-3 font-bold text-slate-700">{sale.usuario_nombre}</td>
                    <td className="px-6 py-3 text-slate-500">
                      {sale.cliente_nombre || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold border capitalize ${methodColors[sale.metodo_pago] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                        {methodLabels[sale.metodo_pago] || sale.metodo_pago}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right font-mono font-bold text-blue-600">
                      {formatMoney(sale.total)}
                    </td>
                  </tr>
                ))}
                {(!data?.recentSales || data.recentSales.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-xs italic">
                      {t.noData}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {rangeModalOpen && (
        <DateRangeModal
          initialFrom={range.from}
          initialTo={range.to}
          onApply={(from, to) => setRange({ from, to })}
          onClear={() => setRange(getTodayRange())}
          onClose={() => setRangeModalOpen(false)}
        />
      )}
    </div>
  );
};
