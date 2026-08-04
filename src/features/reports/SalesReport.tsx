import React, { useEffect, useState } from 'react';
import { useResizableColumns } from '../../hooks/useResizableColumns';
import { supabase } from '../../api/supabaseClient';
import { useLanguage } from '../../context/LanguageContext';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { useEmpresa } from '../../context/EmpresaContext';
import { usePermission } from '../../context/PermissionsContext';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Search,
  ArrowUpDown,
  Scissors,
  XCircle,
  CheckCircle2,
  User,
  ChevronLeft,
  ChevronRight,
  Edit3,
} from 'lucide-react';
import { AnulationModal } from '../sales/AnulationModal';
import { EditSaleModal } from '../sales/EditSaleModal';

interface SaleRecord {
  id: string;
  correlativo: number | null;
  total: number;
  metodo_pago: string;
  creado_en: string;
  usuario_nombre: string;
  barbero_nombre: string | null;
  sucursal_nombre: string;
  fecha: string;
  items_detalle: string | null;
  comision_generada: number;
  moneda?: string | null;
  cliente_nombre?: string | null;
}

const ITEMS_PER_PAGE = 25;

const translations = {
  es: {
    title: 'Reporte de Ventas e Ingresos',
    from: 'Desde',
    to: 'Hasta',
    filter: 'Filtrar',
    clear: 'Limpiar',
    tableTitle: 'Historial de Ventas Recientes',
    ticketId: 'Ticket ID',
    date: 'Fecha',
    cashier: 'Cajero',
    barber: 'Atendido Por',
    itemsDetail: 'Detalle de Compra',
    method: 'Pago',
    cliente: 'Cliente',
    commission: 'Comisión',
    total: 'Total',
    noSales: 'No hay ventas en el período seleccionado.',
    loading: 'Cargando reporte...',
    cash: 'Efectivo',
    card: 'Tarjeta',
    transfer: 'Transferencia',
    totalPeriod: 'Total de ventas del período',
    countPeriod: 'Ventas en el período',
    avgTicket: 'Ticket promedio',
  },
  en: {
    title: 'Sales & Revenue Report',
    from: 'From',
    to: 'To',
    filter: 'Filter',
    clear: 'Clear',
    tableTitle: 'Recent Sales History',
    ticketId: 'Ticket ID',
    date: 'Date',
    cashier: 'Cashier',
    barber: 'Assigned Barber',
    itemsDetail: 'Items Purchased',
    method: 'Payment',
    cliente: 'Customer',
    commission: 'Commission',
    total: 'Total',
    noSales: 'No sales in the selected period.',
    loading: 'Loading report...',
    cash: 'Cash',
    card: 'Card',
    transfer: 'Transfer',
    totalPeriod: 'Total sales for the period',
    countPeriod: 'Sales in the period',
    avgTicket: 'Average ticket',
  }
};

const getTodayRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return { start: start.toISOString().split('T')[0], end: now.toISOString().split('T')[0] };
};

const getWeekRange = () => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);
  return { start: monday.toISOString().split('T')[0], end: now.toISOString().split('T')[0] };
};

const getMonthRange = () => {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  return { start: first.toISOString().split('T')[0], end: now.toISOString().split('T')[0] };
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatShortDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const methodColors: Record<string, string> = {
  efectivo: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  tarjeta: 'bg-blue-50 text-blue-700 border-blue-200',
  transferencia: 'bg-purple-50 text-purple-700 border-purple-200',
};

const methodLabels: Record<string, { es: string; en: string }> = {
  efectivo: { es: 'Efectivo', en: 'Cash' },
  tarjeta: { es: 'Tarjeta', en: 'Card' },
  transferencia: { es: 'Transferencia', en: 'Transfer' },
};

type ReportCol = 'ticket' | 'date' | 'cashier' | 'barber' | 'items' | 'method' | 'cliente' | 'commission' | 'total' | 'actions';

const initialReportColWidths: Record<ReportCol, number> = {
  ticket: 120,
  date: 140,
  cashier: 150,
  barber: 150,
  items: 220,
  method: 110,
  cliente: 140,
  commission: 110,
  total: 110,
  actions: 80,
};

export const SalesReport: React.FC = () => {
  const { profile } = useAuth();
  const { lang } = useLanguage();
  const { formatMoney } = useSettings();
  const { impersonating, activeBranchIds } = useEmpresa();
  const t = translations[lang];

  const today = getTodayRange();
  const [activeTab, setActiveTab] = useState<'diario' | 'semanal' | 'mensual' | 'mas'>('diario');
  const [dateFrom, setDateFrom] = useState(today.start);
  const [dateTo, setDateTo] = useState(today.end);
  const [appliedRange, setAppliedRange] = useState<{ from: string; to: string }>({
    from: today.start,
    to: today.end,
  });

  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [summary, setSummary] = useState({ total: 0, count: 0, average: 0 });

  const [anulationTarget, setAnulationTarget] = useState<{ id: string; total: number } | null>(null);
  const [editingSale, setEditingSale] = useState<SaleRecord | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const canAnular = usePermission('anular_venta');
  const isAdmin = profile?.rol === 'admin';

  // Resizable column widths with localStorage persistence
  const { columnWidths, handleMouseDown } = useResizableColumns<ReportCol>(initialReportColWidths, 'col_widths_sales_report');

  const loadReport = async (from: string, to: string) => {
    setLoading(true);
    setCurrentPage(1);
    try {
      const { data, error } = await supabase
        .from('vista_reporte_ventas')
        .select('*')
        .in('sucursal_id', impersonating ? activeBranchIds : [profile?.sucursal_id])
        .gte('creado_en', `${from}T00:00:00Z`)
        .lte('creado_en', `${to}T23:59:59Z`)
        .order('creado_en', { ascending: false });

      if (error) throw error;
      setSales(data || []);
      setAppliedRange({ from, to });

      const totals = (data || []).map((s) => parseFloat(s.total) || 0);
      const total = totals.reduce((sum, v) => sum + v, 0);
      setSummary({
        total,
        count: totals.length,
        average: totals.length ? total / totals.length : 0,
      });
    } catch (err: any) {
      console.error('Error loading sales report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport(dateFrom, dateTo);
  }, []);

  const handleSelectTab = (tab: 'diario' | 'semanal' | 'mensual' | 'mas') => {
    setActiveTab(tab);
    setCurrentPage(1);
    if (tab === 'diario') {
      const range = getTodayRange();
      setDateFrom(range.start);
      setDateTo(range.end);
      loadReport(range.start, range.end);
    } else if (tab === 'semanal') {
      const range = getWeekRange();
      setDateFrom(range.start);
      setDateTo(range.end);
      loadReport(range.start, range.end);
    } else if (tab === 'mensual') {
      const range = getMonthRange();
      setDateFrom(range.start);
      setDateTo(range.end);
      loadReport(range.start, range.end);
    }
  };

  const handleFilter = () => {
    loadReport(dateFrom, dateTo);
  };

  const handleClear = () => {
    const todayRange = getTodayRange();
    setDateFrom(todayRange.start);
    setDateTo(todayRange.end);
    setActiveTab('diario');
    loadReport(todayRange.start, todayRange.end);
  };

  // Pagination slicing
  const totalPages = Math.ceil(sales.length / ITEMS_PER_PAGE) || 1;
  const paginatedSales = sales.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-6">
      {/* Title & Filter Tabs Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          {t.title}
        </h1>

        {/* Filter Tabs Aligned to Right */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
          <button
            type="button"
            onClick={() => handleSelectTab('diario')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'diario' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {lang === 'es' ? 'Diario' : 'Daily'}
          </button>
          <button
            type="button"
            onClick={() => handleSelectTab('semanal')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'semanal' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {lang === 'es' ? 'Semanal' : 'Weekly'}
          </button>
          <button
            type="button"
            onClick={() => handleSelectTab('mensual')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'mensual' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {lang === 'es' ? 'Mensual' : 'Monthly'}
          </button>
          <button
            type="button"
            onClick={() => handleSelectTab('mas')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'mas' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>{lang === 'es' ? 'Más...' : 'More...'}</span>
            <Calendar className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-sm flex items-center gap-2.5 shadow-sm">
          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-start">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.totalPeriod}</p>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-950 font-mono">{formatMoney(summary.total)}</p>
          <p className="text-[10px] text-slate-400 font-medium">
            {formatShortDate(appliedRange.from)} – {formatShortDate(appliedRange.to)}
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-start">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.countPeriod}</p>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-950 font-mono">{summary.count}</p>
          <p className="text-[10px] text-slate-400 font-medium">
            {formatShortDate(appliedRange.from)} – {formatShortDate(appliedRange.to)}
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-start">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.avgTicket}</p>
            <Calendar className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-950 font-mono">{formatMoney(summary.average)}</p>
          <p className="text-[10px] text-slate-400 font-medium">
            {formatShortDate(appliedRange.from)} – {formatShortDate(appliedRange.to)}
          </p>
        </div>
      </div>

      {/* Filter Controls (Shown only when 'Más...' tab is active) */}
      {activeTab === 'mas' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm animate-in fade-in zoom-in duration-200">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="space-y-1 flex-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.from}</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium focus:outline-none focus:border-blue-500 shadow-sm" />
            </div>
            <div className="space-y-1 flex-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.to}</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium focus:outline-none focus:border-blue-500 shadow-sm" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleFilter}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer">
                <Search className="w-3.5 h-3.5" />
                {t.filter}
              </button>
              <button onClick={handleClear}
                className="px-5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer">
                {t.clear}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sales Table with Resizable Columns & Pagination */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
        <div>
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-blue-600" />
              {t.tableTitle}
            </h2>
            <span className="text-[10px] text-slate-400 font-medium">
              {sales.length} {lang === 'es' ? 'registros en total' : 'total records'}
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <span className="w-6 h-6 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin inline-block mr-2 align-middle"></span>
              {t.loading}
            </div>
          ) : sales.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs italic">{t.noSales}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse table-fixed">
                <thead>
                  <tr className="bg-slate-50/90 text-slate-500 uppercase tracking-wider font-extrabold border-b border-slate-200 select-none">
                    {/* Ticket */}
                    <th style={{ width: columnWidths.ticket }} className="relative py-3.5 px-3 whitespace-nowrap group">
                      <span>{t.ticketId}</span>
                      <div onMouseDown={(e) => handleMouseDown('ticket', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400/40 z-10" />
                    </th>

                    {/* Fecha */}
                    <th style={{ width: columnWidths.date }} className="relative py-3.5 px-3 whitespace-nowrap group">
                      <span>{t.date}</span>
                      <div onMouseDown={(e) => handleMouseDown('date', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400/40 z-10" />
                    </th>

                    {/* Cajero */}
                    <th style={{ width: columnWidths.cashier }} className="relative py-3.5 px-3 whitespace-nowrap group">
                      <span>{t.cashier}</span>
                      <div onMouseDown={(e) => handleMouseDown('cashier', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400/40 z-10" />
                    </th>

                    {/* Barbero */}
                    <th style={{ width: columnWidths.barber }} className="relative py-3.5 px-3 whitespace-nowrap group">
                      <span>{t.barber}</span>
                      <div onMouseDown={(e) => handleMouseDown('barber', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400/40 z-10" />
                    </th>

                    {/* Detalle */}
                    <th style={{ width: columnWidths.items }} className="relative py-3.5 px-3 whitespace-nowrap group">
                      <span>{t.itemsDetail}</span>
                      <div onMouseDown={(e) => handleMouseDown('items', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400/40 z-10" />
                    </th>

                    {/* Método Pago */}
                    <th style={{ width: columnWidths.method }} className="relative py-3.5 px-3 whitespace-nowrap group">
                      <span>{t.method}</span>
                      <div onMouseDown={(e) => handleMouseDown('method', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400/40 z-10" />
                    </th>

                    {/* Cliente */}
                    <th style={{ width: columnWidths.cliente }} className="relative py-3.5 px-3 whitespace-nowrap group">
                      <span>{t.cliente}</span>
                      <div onMouseDown={(e) => handleMouseDown('cliente', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400/40 z-10" />
                    </th>

                    {/* Comisión */}
                    <th style={{ width: columnWidths.commission }} className="relative py-3.5 px-3 text-right whitespace-nowrap group">
                      <span>{t.commission}</span>
                      <div onMouseDown={(e) => handleMouseDown('commission', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400/40 z-10" />
                    </th>

                    {/* Total */}
                    <th style={{ width: columnWidths.total }} className="relative py-3.5 px-3 text-right whitespace-nowrap group">
                      <span>{t.total}</span>
                      <div onMouseDown={(e) => handleMouseDown('total', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400/40 z-10" />
                    </th>

                    {/* Acción */}
                    <th style={{ width: columnWidths.actions }} className="relative py-3.5 px-3 text-center whitespace-nowrap group">
                      <span>{lang === 'es' ? 'Acción' : 'Action'}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-3 py-3 font-mono font-bold text-slate-800 truncate">
                        #{sale.correlativo ? sale.correlativo.toString().padStart(8, '0') : sale.id.slice(-8).toUpperCase()}
                      </td>
                      <td className="px-3 py-3 text-slate-600 font-medium whitespace-nowrap truncate">{formatDate(sale.creado_en)}</td>
                      <td className="px-3 py-3 text-slate-800 font-bold truncate">{sale.usuario_nombre}</td>
                      <td className="px-3 py-3 text-slate-700 font-medium truncate">
                        {sale.barbero_nombre ? (
                          <span className="flex items-center gap-1 truncate">
                            <Scissors className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                            <span className="truncate">{sale.barbero_nombre}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-slate-600 truncate" title={sale.items_detalle || ''}>
                        {sale.items_detalle || '—'}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold border capitalize ${methodColors[sale.metodo_pago] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                          {methodLabels[sale.metodo_pago]?.[lang as keyof typeof methodLabels['efectivo']] || sale.metodo_pago}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-600 truncate">
                        {sale.cliente_nombre ? (
                          <span className="flex items-center gap-1.5 truncate">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{sale.cliente_nombre}</span>
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-rose-600 truncate">
                        {sale.comision_generada > 0 ? formatMoney(sale.comision_generada, sale.moneda || undefined) : '—'}
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-blue-600 truncate">{formatMoney(sale.total, sale.moneda || undefined)}</td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {isAdmin && (
                            <button
                              onClick={() => setEditingSale(sale)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                              title={lang === 'es' ? 'Editar venta' : 'Edit sale'}
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}
                          {canAnular && (
                            <button
                              onClick={() => setAnulationTarget({ id: sale.id, total: sale.total })}
                              className="p-1.5 text-rose-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                              title={lang === 'es' ? 'Anular venta' : 'Annul sale'}
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination Footer Controls */}
        {!loading && sales.length > 0 && (
          <div className="bg-slate-50/50 border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>{lang === 'es' ? 'Anterior' : 'Previous'}</span>
            </button>

            <span className="text-xs text-slate-500 font-medium">
              {lang === 'es'
                ? `Página ${currentPage} de ${totalPages} (${sales.length} registros)`
                : `Page ${currentPage} of ${totalPages} (${sales.length} records)`}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>{lang === 'es' ? 'Siguiente' : 'Next'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {editingSale && (
        <EditSaleModal
          sale={editingSale}
          onClose={() => setEditingSale(null)}
          onSuccess={(msg) => {
            setSuccessMessage(msg);
            handleFilter();
            setTimeout(() => setSuccessMessage(null), 4000);
          }}
        />
      )}
      {anulationTarget && (
        <AnulationModal
          saleId={anulationTarget.id}
          saleTotal={anulationTarget.total}
          onClose={() => setAnulationTarget(null)}
          onSuccess={(msg) => {
            setSuccessMessage(msg);
            handleFilter();
            setTimeout(() => setSuccessMessage(null), 4000);
          }}
        />
      )}
    </div>
  );
};
