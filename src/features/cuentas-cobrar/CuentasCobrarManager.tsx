import React, { useEffect, useState, useMemo } from 'react';
import { 
  WalletCards, 
  Search, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  Eye, 
  RefreshCw, 
  User, 
  AlertCircle
} from 'lucide-react';
import { useEmpresa } from '../../context/EmpresaContext';
import { useCash } from '../../context/CashContext';
import { useLanguage } from '../../context/LanguageContext';
import { type CreditoVenta, fetchCuentasPorCobrar } from './cuentasCobrarService';
import { RegistrarAbonoModal } from './RegistrarAbonoModal';
import { DetalleCreditoModal } from './DetalleCreditoModal';

export const CuentasCobrarManager: React.FC = () => {
  const { activeBranchIds } = useEmpresa();
  const { activeTurn } = useCash();
  const { lang } = useLanguage();

  const [loading, setLoading] = useState<boolean>(true);
  const [creditos, setCreditos] = useState<CreditoVenta[]>([]);
  const [search, setSearch] = useState<string>('');
  const [estadoFilter, setEstadoFilter] = useState<'todos' | 'pendiente' | 'parcial' | 'pagado'>('todos');

  // Modales
  const [selectedVentaAbonar, setSelectedVentaAbonar] = useState<CreditoVenta | null>(null);
  const [selectedVentaDetalle, setSelectedVentaDetalle] = useState<CreditoVenta | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchCuentasPorCobrar(activeBranchIds, {
        estado: estadoFilter,
        search,
      });
      setCreditos(data);
    } catch (err) {
      console.error('Error loading cuentas por cobrar:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeBranchIds, estadoFilter]);

  // Filtrado reactivo en memoria para búsqueda instantánea
  const filteredCreditos = useMemo(() => {
    if (!search.trim()) return creditos;
    const term = search.toLowerCase().trim();
    return creditos.filter((c) => {
      const matchCliente = c.cliente_nombre?.toLowerCase().includes(term);
      const matchTicket = c.correlativo?.toString().includes(term);
      const matchId = c.id.toLowerCase().includes(term);
      return matchCliente || matchTicket || matchId;
    });
  }, [creditos, search]);

  // KPIs
  const kpis = useMemo(() => {
    const totalPorCobrar = creditos.reduce((sum, c) => sum + c.saldo_pendiente, 0);
    const totalCobrado = creditos.reduce((sum, c) => sum + c.monto_pagado, 0);
    const totalCredito = creditos.reduce((sum, c) => sum + c.total, 0);
    const pendientesCount = creditos.filter((c) => c.saldo_pendiente > 0).length;

    return {
      totalPorCobrar,
      totalCobrado,
      totalCredito,
      pendientesCount,
    };
  }, [creditos]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(lang === 'es' ? 'es-PE' : 'en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100/60 shadow-2xs">
              <WalletCards className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span>{lang === 'es' ? 'Cuentas por Cobrar' : 'Accounts Receivable'}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {lang === 'es' 
              ? 'Control interno de ventas al crédito, cuotas de clientes y registro de amortizaciones' 
              : 'Internal credit sales control, customer installment schedule and payment tracking'}
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
          <span>{lang === 'es' ? 'Actualizar' : 'Refresh'}</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total por cobrar */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-blue-100 shadow-sm bg-gradient-to-br from-white to-blue-50/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-600">
              {lang === 'es' ? 'Total por Cobrar' : 'Total to Collect'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-100/60 text-blue-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            S/ {kpis.totalPorCobrar.toFixed(2)}
          </div>
          <p className="text-[10px] text-slate-500 font-medium mt-1">
            {kpis.pendientesCount} {lang === 'es' ? 'ventas con saldo activo' : 'unsettled credit sales'}
          </p>
        </div>

        {/* Total Cobrado */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600">
              {lang === 'es' ? 'Total Cobrado' : 'Total Collected'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            S/ {kpis.totalCobrado.toFixed(2)}
          </div>
          <p className="text-[10px] text-slate-500 font-medium mt-1">
            {lang === 'es' ? 'Amortizado en caja' : 'Collected into register'}
          </p>
        </div>

        {/* Total Facturado al Crédito */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              {lang === 'es' ? 'Ventas al Crédito' : 'Total Credit Sales'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <WalletCards className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            S/ {kpis.totalCredito.toFixed(2)}
          </div>
          <p className="text-[10px] text-slate-500 font-medium mt-1">
            {creditos.length} {lang === 'es' ? 'operaciones registradas' : 'credit records'}
          </p>
        </div>

        {/* Efectividad de Cobranza */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              {lang === 'es' ? 'Recuperación' : 'Collection Rate'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {kpis.totalCredito > 0 
              ? `${Math.round((kpis.totalCobrado / kpis.totalCredito) * 100)}%`
              : '0%'}
          </div>
          <p className="text-[10px] text-slate-500 font-medium mt-1">
            {lang === 'es' ? 'Porcentaje amortizado' : 'Amortized percentage'}
          </p>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Controls / Filter Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === 'es' ? 'Buscar por cliente o ticket #...' : 'Search by customer or ticket #...'}
              className="w-full pl-9 pr-4 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500 text-slate-800 shadow-2xs transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start md:self-auto">
            {(['todos', 'pendiente', 'parcial', 'pagado'] as const).map((est) => {
              const isActive = estadoFilter === est;
              return (
                <button
                  key={est}
                  onClick={() => setEstadoFilter(est)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {est === 'todos' 
                    ? (lang === 'es' ? 'Todos' : 'All') 
                    : est === 'pendiente'
                      ? (lang === 'es' ? 'Pendientes' : 'Pending')
                      : est === 'parcial'
                        ? (lang === 'es' ? 'Parciales' : 'Partial')
                        : (lang === 'es' ? 'Pagados' : 'Paid')}
                </button>
              );
            })}
          </div>
        </div>

        {/* Table / List */}
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <div className="w-7 h-7 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2" />
            <span>{lang === 'es' ? 'Cargando cuentas por cobrar...' : 'Loading accounts receivable...'}</span>
          </div>
        ) : filteredCreditos.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-600">
              {lang === 'es' ? 'No se encontraron créditos registrados' : 'No credit sales found'}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {lang === 'es' 
                ? 'Las ventas al crédito que realices desde el POS aparecerán aquí para control de cuotas y cobranzas.' 
                : 'Credit sales made from the POS will appear here for installment tracking.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-extrabold border-b border-slate-200 select-none">
                  <th className="py-3 px-4">{lang === 'es' ? 'Ticket' : 'Ticket'}</th>
                  <th className="py-3 px-4">{lang === 'es' ? 'Cliente' : 'Customer'}</th>
                  <th className="py-3 px-4">{lang === 'es' ? 'Fecha' : 'Date'}</th>
                  <th className="py-3 px-4 text-right">{lang === 'es' ? 'Total Venta' : 'Total'}</th>
                  <th className="py-3 px-4 text-right">{lang === 'es' ? 'Abonado' : 'Paid'}</th>
                  <th className="py-3 px-4 text-right">{lang === 'es' ? 'Saldo Pendiente' : 'Balance'}</th>
                  <th className="py-3 px-4">{lang === 'es' ? 'Progreso' : 'Progress'}</th>
                  <th className="py-3 px-4 text-center">{lang === 'es' ? 'Estado' : 'Status'}</th>
                  <th className="py-3 px-4 text-center">{lang === 'es' ? 'Acciones' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCreditos.map((c) => {
                  const pct = c.total > 0 ? Math.min(100, Math.round((c.monto_pagado / c.total) * 100)) : 0;
                  const isCancelado = c.estado_pago === 'pagado' || c.saldo_pendiente <= 0;
                  const isParcial = c.estado_pago === 'parcial';

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Ticket */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        #{c.correlativo ? String(c.correlativo).padStart(8, '0') : c.id.slice(-8).toUpperCase()}
                      </td>

                      {/* Cliente */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[10px] shrink-0">
                            <User className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-bold text-slate-800 truncate max-w-[160px]">
                            {c.cliente_nombre || '—'}
                          </span>
                        </div>
                      </td>

                      {/* Fecha */}
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {formatDate(c.creado_en)}
                      </td>

                      {/* Total */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800">
                        S/ {c.total.toFixed(2)}
                      </td>

                      {/* Monto Pagado */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600">
                        S/ {c.monto_pagado.toFixed(2)}
                      </td>

                      {/* Saldo Pendiente */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-blue-700">
                        S/ {c.saldo_pendiente.toFixed(2)}
                      </td>

                      {/* Progreso */}
                      <td className="py-3.5 px-4 w-32">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-bold text-slate-400">
                            <span>{pct}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                isCancelado ? 'bg-emerald-500' : 'bg-blue-600'
                              }`} 
                              style={{ width: `${pct}%` }} 
                            />
                          </div>
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                          isCancelado
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isParcial
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {isCancelado 
                            ? (lang === 'es' ? 'Pagado' : 'Paid')
                            : isParcial 
                              ? (lang === 'es' ? 'Parcial' : 'Partial')
                              : (lang === 'es' ? 'Pendiente' : 'Pending')}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Ver Detalle */}
                          <button
                            onClick={() => setSelectedVentaDetalle(c)}
                            title={lang === 'es' ? 'Ver expediente / cuotas' : 'View credit ledger'}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-blue-100"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Abonar */}
                          {c.saldo_pendiente > 0 && (
                            <button
                              onClick={() => setSelectedVentaAbonar(c)}
                              className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              <span>{lang === 'es' ? 'Abonar' : 'Pay'}</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Registrar Abono */}
      {selectedVentaAbonar && (
        <RegistrarAbonoModal
          venta={selectedVentaAbonar}
          currentTurnId={activeTurn?.id || null}
          onClose={() => setSelectedVentaAbonar(null)}
          onSuccess={() => {
            loadData();
          }}
        />
      )}

      {/* Modal Detalle / Expediente Crédito */}
      {selectedVentaDetalle && (
        <DetalleCreditoModal
          venta={selectedVentaDetalle}
          onClose={() => setSelectedVentaDetalle(null)}
          onOpenAbonar={() => {
            setSelectedVentaAbonar(selectedVentaDetalle);
          }}
        />
      )}

    </div>
  );
};
