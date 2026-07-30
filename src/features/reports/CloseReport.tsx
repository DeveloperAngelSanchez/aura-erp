import React, { useEffect, useState } from 'react';
import { useResizableColumns } from '../../hooks/useResizableColumns';
import { supabase } from '../../api/supabaseClient';
import { useLanguage } from '../../context/LanguageContext';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { useEmpresa } from '../../context/EmpresaContext';
import { TurnDetail } from './TurnDetail';
import { CreateHistoricalTurnModal } from './CreateHistoricalTurnModal';
import { ReassignSalesModal } from './ReassignSalesModal';
import {
  DollarSign,
  TrendingUp,
  Search,
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Receipt,
  Hourglass,
  Plus,
  ArrowRightLeft,
  ArrowUpDown,
  User,
  Eye,
} from 'lucide-react';

interface CloseRecord {
  id: string;
  sucursal_id: string;
  sucursal_nombre: string;
  usuario_id: string;
  usuario_nombre: string;
  monto_apertura: number;
  monto_cierre_esperado: number | null;
  monto_cierre_real: number | null;
  diferencia_caja: number | null;
  abierto_en: string;
  cerrado_en: string | null;
  duracion_horas: number | null;
  cantidad_ventas: number;
  total_ventas: number;
  total_efectivo: number;
  total_tarjeta: number;
  total_transferencia: number;
  total_otros_metodos: number;
  total_ingresos_manuales: number;
  total_egresos_manuales: number;
}

const ITEMS_PER_PAGE = 25;

const translations = {
  es: {
    title: 'Cierres de Turno',
    periodSales: 'Ventas del Período',
    netDiffs: 'Diferencias Netas',
    closeCount: 'Cierres Realizados',
    avgSales: 'Promedio por Turno',
    from: 'Desde',
    to: 'Hasta',
    filter: 'Filtrar',
    clear: 'Limpiar',
    tableTitle: 'Historial de Cierres',
    apertura: 'Apertura',
    cierre: 'Cierre',
    cashier: 'Cajero',
    opening: 'Monto Apertura',
    sales: 'Ventas',
    expected: 'Esperado',
    actual: 'Real',
    diff: 'Diferencia',
    qtySales: '# Ventas',
    duration: 'Duración',
    noRecords: 'No hay cierres en el período seleccionado.',
    loading: 'Cargando reporte...',
    perfect: 'Cuadre Perfecto',
    deficit: 'Faltante',
    surplus: 'Sobrante',
    hours: 'hrs',
  },
  en: {
    title: 'Shift Closings',
    periodSales: 'Period Sales',
    netDiffs: 'Net Differences',
    closeCount: 'Closings',
    avgSales: 'Avg per Shift',
    from: 'From',
    to: 'To',
    filter: 'Filter',
    clear: 'Clear',
    tableTitle: 'Closing History',
    apertura: 'Opened',
    cierre: 'Closed',
    cashier: 'Cashier',
    opening: 'Opening Cash',
    sales: 'Sales',
    expected: 'Expected',
    actual: 'Actual',
    diff: 'Difference',
    qtySales: '# Sales',
    duration: 'Duration',
    noRecords: 'No closings in the selected period.',
    loading: 'Loading report...',
    perfect: 'Perfect Audit',
    deficit: 'Deficit',
    surplus: 'Surplus',
    hours: 'hrs',
  },
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

type CloseCol = 'apertura' | 'cierre' | 'cajero' | 'opening' | 'sales' | 'expected' | 'actual' | 'diff' | 'qtySales' | 'duration' | 'actions';

const initialColWidths: Record<CloseCol, number> = {
  apertura: 140,
  cierre: 140,
  cajero: 150,
  opening: 120,
  sales: 120,
  expected: 120,
  actual: 120,
  diff: 130,
  qtySales: 80,
  duration: 90,
  actions: 70,
};

export const CloseReport: React.FC = () => {
  const { profile } = useAuth();
  const { lang } = useLanguage();
  const { formatMoney } = useSettings();
  const { impersonating, activeBranchIds } = useEmpresa();
  const t = translations[lang];

  const month = getMonthRange();
  const [dateFrom, setDateFrom] = useState(month.start);
  const [dateTo, setDateTo] = useState(month.end);

  const [records, setRecords] = useState<CloseRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTurnId, setSelectedTurnId] = useState<string | null>(null);

  const [isCreateHistoricalOpen, setIsCreateHistoricalOpen] = useState(false);
  const [isReassignOpen, setIsReassignOpen] = useState(false);

  const isAdmin = profile?.rol === 'admin' || profile?.rol_sistema === 'sistema_admin';

  const { columnWidths, handleMouseDown } = useResizableColumns<CloseCol>(initialColWidths, 'col_widths_close_report');

  const loadReport = async (from: string, to: string) => {
    setLoading(true);
    setCurrentPage(1);
    try {
      const branchFilter = impersonating ? activeBranchIds : [profile?.sucursal_id];
      const { data, error } = await supabase
        .from('vista_reporte_cierres_turno')
        .select('*')
        .in('sucursal_id', branchFilter)
        .gte('cerrado_en', `${from}T00:00:00Z`)
        .lte('cerrado_en', `${to}T23:59:59Z`)
        .order('cerrado_en', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (err: any) {
      console.error('Error loading close report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport(dateFrom, dateTo);
  }, []);

  const handleFilter = () => {
    loadReport(dateFrom, dateTo);
  };

  const handleClear = () => {
    const m = getMonthRange();
    setDateFrom(m.start);
    setDateTo(m.end);
    loadReport(m.start, m.end);
  };

  const totalSales = records.reduce((sum, r) => sum + r.total_ventas, 0);
  const totalDiffs = records.reduce((sum, r) => sum + (r.diferencia_caja || 0), 0);
  const totalCloses = records.length;
  const avgSalesVal = totalCloses > 0 ? totalSales / totalCloses : 0;

  const totalPages = Math.ceil(records.length / ITEMS_PER_PAGE) || 1;
  const paginatedRecords = records.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const renderDiffBadge = (diff: number | null) => {
    if (diff === null || diff === undefined) return null;
    const absDiff = Math.abs(diff);
    if (absDiff < 0.01) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3" />
          {t.perfect}
        </span>
      );
    }
    if (diff < 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <AlertCircle className="w-3 h-3" />
          {t.deficit} {formatMoney(absDiff)}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
        <ShieldCheck className="w-3 h-3" />
        {t.surplus} {formatMoney(diff)}
      </span>
    );
  };

  if (selectedTurnId) {
    return <TurnDetail turnId={selectedTurnId} onBack={() => setSelectedTurnId(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          {t.title}
        </h1>

        {isAdmin && (
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsCreateHistoricalOpen(true)}
              className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-blue-600" />
              <span>Crear Turno Histórico</span>
            </button>

            <button
              onClick={() => setIsReassignOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Anexar / Reasignar Ventas</span>
            </button>
          </div>
        )}
      </div>

      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-start">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.periodSales}</p>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-950 font-mono">{formatMoney(totalSales)}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-start">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.netDiffs}</p>
            <DollarSign className="w-4 h-4 text-rose-600" />
          </div>
          <p className={`text-2xl font-extrabold font-mono ${totalDiffs < 0 ? 'text-rose-600' : totalDiffs > 0 ? 'text-amber-600' : 'text-slate-950'}`}>
            {formatMoney(totalDiffs)}
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-start">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.closeCount}</p>
            <Receipt className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-950 font-mono">{totalCloses}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-start">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.avgSales}</p>
            <Hourglass className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-950 font-mono">{formatMoney(avgSalesVal)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
        <div>
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-blue-600" />
              {t.tableTitle}
            </h2>
            <span className="text-[10px] text-slate-400 font-medium">
              {records.length} {lang === 'es' ? 'registros en total' : 'total records'}
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <span className="w-6 h-6 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin inline-block mr-2 align-middle"></span>
              {t.loading}
            </div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs italic">{t.noRecords}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse table-fixed">
                <thead>
                  <tr className="bg-slate-50/90 text-slate-500 uppercase tracking-wider font-extrabold border-b border-slate-200 select-none">
                    <th style={{ width: columnWidths.apertura }} className="relative py-3.5 px-3 whitespace-nowrap group">
                      <span>{t.apertura}</span>
                      <div onMouseDown={(e) => handleMouseDown('apertura', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400/40 z-10" />
                    </th>
                    <th style={{ width: columnWidths.cierre }} className="relative py-3.5 px-3 whitespace-nowrap group">
                      <span>{t.cierre}</span>
                      <div onMouseDown={(e) => handleMouseDown('cierre', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400/40 z-10" />
                    </th>
                    <th style={{ width: columnWidths.cajero }} className="relative py-3.5 px-3 whitespace-nowrap group">
                      <span>{t.cashier}</span>
                      <div onMouseDown={(e) => handleMouseDown('cajero', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400/40 z-10" />
                    </th>
                    <th style={{ width: columnWidths.opening }} className="relative py-3.5 px-3 text-right whitespace-nowrap group">
                      <span>{t.opening}</span>
                      <div onMouseDown={(e) => handleMouseDown('opening', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400/40 z-10" />
                    </th>
                    <th style={{ width: columnWidths.sales }} className="relative py-3.5 px-3 text-right whitespace-nowrap group">
                      <span>{t.sales}</span>
                      <div onMouseDown={(e) => handleMouseDown('sales', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400/40 z-10" />
                    </th>
                    <th style={{ width: columnWidths.expected }} className="relative py-3.5 px-3 text-right whitespace-nowrap group">
                      <span>{t.expected}</span>
                      <div onMouseDown={(e) => handleMouseDown('expected', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400/40 z-10" />
                    </th>
                    <th style={{ width: columnWidths.actual }} className="relative py-3.5 px-3 text-right whitespace-nowrap group">
                      <span>{t.actual}</span>
                      <div onMouseDown={(e) => handleMouseDown('actual', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400/40 z-10" />
                    </th>
                    <th style={{ width: columnWidths.diff }} className="relative py-3.5 px-3 whitespace-nowrap group">
                      <span>{t.diff}</span>
                      <div onMouseDown={(e) => handleMouseDown('diff', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400/40 z-10" />
                    </th>
                    <th style={{ width: columnWidths.qtySales }} className="relative py-3.5 px-3 text-right whitespace-nowrap group">
                      <span>{t.qtySales}</span>
                      <div onMouseDown={(e) => handleMouseDown('qtySales', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400/40 z-10" />
                    </th>
                    <th style={{ width: columnWidths.duration }} className="relative py-3.5 px-3 text-right whitespace-nowrap group">
                      <span>{t.duration}</span>
                      <div onMouseDown={(e) => handleMouseDown('duration', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400/40 z-10" />
                    </th>
                    <th style={{ width: columnWidths.actions }} className="relative py-3.5 px-3 text-center whitespace-nowrap group">
                      <span>{lang === 'es' ? 'Acción' : 'Action'}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-3 py-3 text-slate-700 font-medium whitespace-nowrap truncate">
                        {formatDate(r.abierto_en)}
                      </td>
                      <td className="px-3 py-3 text-slate-700 font-medium whitespace-nowrap truncate">
                        {r.cerrado_en ? formatDate(r.cerrado_en) : '—'}
                      </td>
                      <td className="px-3 py-3 text-slate-800 font-bold truncate">
                        <span className="flex items-center gap-1.5 truncate">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{r.usuario_nombre}</span>
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-slate-800 truncate">
                        {formatMoney(r.monto_apertura)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-blue-600 truncate">
                        {formatMoney(r.total_ventas)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-slate-700 truncate">
                        {r.monto_cierre_esperado !== null ? formatMoney(r.monto_cierre_esperado) : '—'}
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-slate-700 truncate">
                        {r.monto_cierre_real !== null ? formatMoney(r.monto_cierre_real) : '—'}
                      </td>
                      <td className="px-3 py-3 truncate">
                        {renderDiffBadge(r.diferencia_caja)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-slate-700 truncate">
                        {r.cantidad_ventas}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-slate-600 truncate">
                        {r.duracion_horas !== null ? `${r.duracion_horas.toFixed(1)} ${t.hours}` : '—'}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => setSelectedTurnId(r.id)}
                          className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                          title={lang === 'es' ? 'Ver detalle del turno' : 'View turn detail'}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!loading && records.length > 0 && (
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
                ? `Página ${currentPage} de ${totalPages} (${records.length} registros)`
                : `Page ${currentPage} of ${totalPages} (${records.length} records)`}
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

      <CreateHistoricalTurnModal
        isOpen={isCreateHistoricalOpen}
        onClose={() => setIsCreateHistoricalOpen(false)}
        onSuccess={() => {
          loadReport(dateFrom, dateTo);
        }}
      />

      <ReassignSalesModal
        isOpen={isReassignOpen}
        onClose={() => setIsReassignOpen(false)}
        onSuccess={() => {
          loadReport(dateFrom, dateTo);
        }}
      />
    </div>
  );
};
