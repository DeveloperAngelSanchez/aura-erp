import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../api/supabaseClient';
import { useCash } from '../../context/CashContext';
import { useLanguage } from '../../context/LanguageContext';
import { useSettings } from '../../context/SettingsContext';
import {
  AlertCircle,
  CheckCircle2,
  Lock,
  X,
  Loader2,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  Scale,
  Smartphone,
  Banknote,
  ArrowRightLeft,
  Receipt,
  User,
  ChevronDown,
} from 'lucide-react';

interface Props {
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

interface Movimiento {
  id: string;
  tipo: string;
  monto: number;
  motivo: string;
  creado_en: string;
}

interface VentasResumen {
  metodo: string;
  monto: number;
}

interface PagoDetallado {
  saleId: string;
  correlativo: number | null;
  creado_en: string;
  cliente_nombre: string | null;
  metodo: string;
  monto: number;
}

export const EnterpriseCloseTurnModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  const { lang } = useLanguage();
  const { formatMoney } = useSettings();
  const { activeTurn, closeTurn } = useCash();

  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Financial totals
  const [montoApertura, setMontoApertura] = useState(0);
  const [ventasPorMetodo, setVentasPorMetodo] = useState<VentasResumen[]>([]);
  const [totalVentasEfectivo, setTotalVentasEfectivo] = useState(0);
  const [totalVentasGeneral, setTotalVentasGeneral] = useState(0);

  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [totalIngresosManuales, setTotalIngresosManuales] = useState(0);
  const [totalEgresosManuales, setTotalEgresosManuales] = useState(0);

  const [efectivoEsperado, setEfectivoEsperado] = useState(0);
  const [efectivoReal, setEfectivoReal] = useState('');

  // Close turn keyboard & backdrop listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

  const [detallesMetodosMap, setDetallesMetodosMap] = useState<Record<string, PagoDetallado[]>>({});
  const [selectedMetodo, setSelectedMetodo] = useState<string | null>(null);

  // Helper icon selector
  const getMetodoIcon = (metodo: string) => {
    const m = metodo.toLowerCase();
    if (m.includes('yape') || m.includes('plin') || m.includes('qr')) {
      return <Smartphone className="w-4 h-4 text-purple-600 shrink-0" />;
    }
    if (m.includes('tarjeta') || m.includes('card') || m.includes('pos')) {
      return <CreditCard className="w-4 h-4 text-blue-600 shrink-0" />;
    }
    if (m.includes('transfer') || m.includes('banco')) {
      return <ArrowRightLeft className="w-4 h-4 text-emerald-600 shrink-0" />;
    }
    return <Banknote className="w-4 h-4 text-amber-600 shrink-0" />;
  };

  // Load shift financial details
  useEffect(() => {
    const loadShiftData = async () => {
      if (!activeTurn) return;
      try {
        setLoading(true);
        setError(null);

        const apertura = activeTurn.monto_apertura || 0;
        setMontoApertura(apertura);

        // 1. Fetch completed sales & payment methods for current turn
        const { data: salesData, error: salesErr } = await supabase
          .from('ventas')
          .select('id, total, metodo_pago, creado_en, correlativo, cliente_nombre, venta_pagos(metodo_pago, monto)')
          .eq('turno_id', activeTurn.id)
          .eq('estado', 'completada')
          .order('creado_en', { ascending: false });

        if (salesErr) throw salesErr;

        // Aggregate by payment method & collect transaction details
        const metodosMap: Record<string, number> = {};
        const detallesMap: Record<string, PagoDetallado[]> = {};
        let cashSales = 0;
        let totalSales = 0;

        (salesData || []).forEach((sale) => {
          totalSales += sale.total || 0;
          const pagos = sale.venta_pagos || [];
          if (pagos.length > 0) {
            pagos.forEach((pago) => {
              const mName = pago.metodo_pago ? pago.metodo_pago.trim().toLowerCase() : 'efectivo';
              const val = pago.monto || 0;
              metodosMap[mName] = (metodosMap[mName] || 0) + val;
              if (mName === 'efectivo') {
                cashSales += val;
              }
              if (!detallesMap[mName]) detallesMap[mName] = [];
              detallesMap[mName].push({
                saleId: sale.id,
                correlativo: sale.correlativo,
                creado_en: sale.creado_en,
                cliente_nombre: sale.cliente_nombre,
                metodo: mName,
                monto: val,
              });
            });
          } else {
            const mName = sale.metodo_pago ? sale.metodo_pago.trim().toLowerCase() : 'efectivo';
            const val = sale.total || 0;
            metodosMap[mName] = (metodosMap[mName] || 0) + val;
            if (mName === 'efectivo') {
              cashSales += val;
            }
            if (!detallesMap[mName]) detallesMap[mName] = [];
            detallesMap[mName].push({
              saleId: sale.id,
              correlativo: sale.correlativo,
              creado_en: sale.creado_en,
              cliente_nombre: sale.cliente_nombre,
              metodo: mName,
              monto: val,
            });
          }
        });

        const resumenList: VentasResumen[] = Object.entries(metodosMap).map(([metodo, monto]) => ({
          metodo,
          monto: Math.round(monto * 100) / 100,
        }));

        setVentasPorMetodo(resumenList);
        setDetallesMetodosMap(detallesMap);
        setTotalVentasEfectivo(Math.round(cashSales * 100) / 100);
        setTotalVentasGeneral(Math.round(totalSales * 100) / 100);

        // 2. Fetch manual cash movements for current turn
        const { data: movsData, error: movsErr } = await supabase
          .from('caja_movimientos')
          .select('*')
          .eq('turno_id', activeTurn.id)
          .order('creado_en', { ascending: false });

        if (movsErr) throw movsErr;

        let manualIncomes = 0;
        let manualExpenses = 0;

        (movsData || []).forEach((m) => {
          const val = m.monto || 0;
          if (m.tipo === 'ingreso_manual') {
            manualIncomes += val;
          } else if (m.tipo === 'egreso_manual') {
            // Avoid double-subtraction for sales annulments since annulled sales are excluded from cashSales
            if (!m.motivo || !m.motivo.startsWith('Anulación venta')) {
              manualExpenses += val;
            }
          }
        });

        setMovimientos(movsData || []);
        setTotalIngresosManuales(Math.round(manualIncomes * 100) / 100);
        setTotalEgresosManuales(Math.round(manualExpenses * 100) / 100);

        // 3. Fetch pending cash movement approvals
        const { count: pendingCount } = await supabase
          .from('movimientos_caja_solicitudes')
          .select('id', { count: 'exact', head: true })
          .eq('turno_id', activeTurn.id)
          .eq('estado', 'pendiente');

        setPendingApprovalsCount(pendingCount || 0);

        // Expected Cash in Drawer = Base + Cash Sales + Manual Incomes - Manual Expenses
        const expected = Math.round((apertura + cashSales + manualIncomes - manualExpenses) * 100) / 100;
        setEfectivoEsperado(expected);
        setEfectivoReal(expected.toFixed(2));
      } catch (err: any) {
        console.error('Error loading shift details:', err);
        setError(err.message || 'Error al cargar resumen del turno');
      } finally {
        setLoading(false);
      }
    };

    loadShiftData();
  }, [activeTurn]);

  const handleConfirmClose = async (e: React.FormEvent) => {
    e.preventDefault();
    const realNum = parseFloat(efectivoReal);
    if (isNaN(realNum) || realNum < 0) {
      setError(lang === 'es' ? 'Ingresa un monto válido contado en caja' : 'Enter a valid counted amount');
      return;
    }

    try {
      setClosing(true);
      setError(null);

      const success = await closeTurn(realNum, efectivoEsperado);
      if (success) {
        onSuccess(lang === 'es' ? 'Turno de caja cerrado exitosamente con arqueo enterprise' : 'Cash shift closed successfully');
        onClose();
      } else {
        throw new Error(lang === 'es' ? 'No se pudo cerrar el turno' : 'Failed to close turn');
      }
    } catch (err: any) {
      setError(err.message || 'Error al cerrar el turno');
    } finally {
      setClosing(false);
    }
  };

  const realVal = parseFloat(efectivoReal) || 0;
  const diferencia = realVal - efectivoEsperado;

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] text-slate-800 animate-in fade-in zoom-in duration-205"
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 px-6 py-4 shrink-0 bg-slate-50/50 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-50 border border-rose-100 rounded-xl">
              <Lock className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                {lang === 'es' ? 'Cierre Enterprise de Caja' : 'Enterprise Shift Close'}
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                {lang === 'es' ? 'Resumen detallado de ingresos, egresos y cuadre por caja' : 'Detailed summary of income, expenses, and cash audit'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl text-xs flex items-center gap-2 shadow-sm">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {pendingApprovalsCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 shadow-sm">
              <AlertCircle className="w-4.5 h-4.5 text-amber-600 shrink-0" />
              <div>
                <p className="font-extrabold text-amber-900">
                  {lang === 'es'
                    ? `Atención: Hay ${pendingApprovalsCount} movimiento(s) de caja pendiente(s) de aprobación.`
                    : `Warning: There are ${pendingApprovalsCount} pending cash movement approval(s).`}
                </p>
                <p className="text-[11px] text-amber-700 font-medium">
                  {lang === 'es'
                    ? 'Los movimientos no aprobados aún no se reflejan en el efectivo esperado.'
                    : 'Unapproved movements are not yet reflected in expected cash.'}
                </p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400 space-x-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="text-sm font-semibold">{lang === 'es' ? 'Calculando cuadre de caja...' : 'Calculating cash audit...'}</span>
            </div>
          ) : (
            <>
              {/* Financial KPI Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {lang === 'es' ? 'Efectivo Apertura' : 'Opening Cash'}
                  </span>
                  <span className="text-sm font-black text-slate-900 font-mono">{formatMoney(montoApertura)}</span>
                </div>

                <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
                    {lang === 'es' ? 'Ventas Efectivo' : 'Cash Sales'}
                  </span>
                  <span className="text-sm font-black text-emerald-700 font-mono">+{formatMoney(totalVentasEfectivo)}</span>
                </div>

                <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                    {lang === 'es' ? 'Ingresos Manuales' : 'Manual Incomes'}
                  </span>
                  <span className="text-sm font-black text-blue-700 font-mono">+{formatMoney(totalIngresosManuales)}</span>
                </div>

                <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">
                    {lang === 'es' ? 'Egresos Manuales' : 'Manual Expenses'}
                  </span>
                  <span className="text-sm font-black text-rose-700 font-mono">-{formatMoney(totalEgresosManuales)}</span>
                </div>
              </div>

              {/* Payment Methods Breakdown */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    <span>{lang === 'es' ? 'Desglose de Ventas por Método de Pago' : 'Sales by Payment Method'}</span>
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-700">
                    {lang === 'es' ? 'Total' : 'Total'}: {formatMoney(totalVentasGeneral)}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                  {ventasPorMetodo.length === 0 ? (
                    <p className="text-xs text-slate-400 col-span-3 italic">{lang === 'es' ? 'No se registraron ventas en este turno' : 'No sales recorded in this turn'}</p>
                  ) : (
                    ventasPorMetodo.map((v) => {
                      const isSelected = selectedMetodo === v.metodo;
                      const count = detallesMetodosMap[v.metodo]?.length || 0;
                      return (
                        <button
                          key={v.metodo}
                          type="button"
                          onClick={() => setSelectedMetodo(isSelected ? null : v.metodo)}
                          className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-600/20 shadow-sm'
                              : 'bg-slate-50 hover:bg-blue-50/40 border-slate-200 hover:border-blue-300'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full mb-1">
                            <span className="text-xs font-extrabold text-slate-800 capitalize flex items-center gap-1.5">
                              {getMetodoIcon(v.metodo)}
                              <span>{v.metodo}</span>
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                              {count} {count === 1 ? 'pago' : 'pagos'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between w-full mt-1">
                            <span className="text-xs font-extrabold font-mono text-slate-900">{formatMoney(v.monto)}</span>
                            <span className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-0.5">
                              <span>{isSelected ? (lang === 'es' ? 'Ocultar' : 'Hide') : (lang === 'es' ? 'Ver detalle' : 'View list')}</span>
                              <ChevronDown className={`w-3 h-3 transition-transform ${isSelected ? 'rotate-180' : ''}`} />
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Drill-down Transaction List for Selected Payment Method */}
                {selectedMetodo && (
                  <div className="bg-slate-50/90 border border-blue-200 rounded-xl p-3.5 space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                          {getMetodoIcon(selectedMetodo)}
                        </div>
                        <div>
                          <h4 className="text-xs font-extrabold text-slate-900 capitalize">
                            {lang === 'es' ? `Listado de Ventas: ${selectedMetodo}` : `Sales Breakdown: ${selectedMetodo}`}
                          </h4>
                          <p className="text-[10px] text-slate-500 font-medium">
                            {(detallesMetodosMap[selectedMetodo] || []).length} {lang === 'es' ? 'transacción(es) realizada(s)' : 'transaction(s)'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold font-mono text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-lg">
                          Total: {formatMoney(ventasPorMetodo.find(v => v.metodo === selectedMetodo)?.monto || 0)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedMetodo(null)}
                          className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                      {(!detallesMetodosMap[selectedMetodo] || detallesMetodosMap[selectedMetodo].length === 0) ? (
                        <p className="text-xs text-slate-400 italic py-2 text-center">{lang === 'es' ? 'No se encontraron registros' : 'No records found'}</p>
                      ) : (
                        detallesMetodosMap[selectedMetodo].map((tx, idx) => (
                          <div key={`${tx.saleId}-${idx}`} className="bg-white border border-slate-200/90 rounded-xl p-2.5 flex items-center justify-between shadow-2xs hover:border-blue-200 transition-colors">
                            <div className="flex items-center gap-2.5">
                              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg shrink-0 border border-blue-100">
                                <Receipt className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black font-mono text-slate-900">
                                    Ticket #{tx.correlativo ? tx.correlativo.toString().padStart(8, '0') : 'N/A'}
                                  </span>
                                  <span className="text-[10px] font-semibold text-slate-400">
                                    {new Date(tx.creado_en).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                                  <User className="w-3 h-3 text-slate-400" />
                                  <span>{tx.cliente_nombre || (lang === 'es' ? 'Cliente General' : 'General Customer')}</span>
                                </p>
                              </div>
                            </div>
                            <span className="text-xs font-black font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200/60">
                              +{formatMoney(tx.monto)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Manual Movements List */}
              {movimientos.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5 shadow-2xs">
                  <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <Scale className="w-4 h-4 text-purple-600" />
                    <span>{lang === 'es' ? 'Movimientos Manuales de Caja' : 'Manual Cash Movements'}</span>
                  </span>

                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {movimientos.map((m) => (
                      <div key={m.id} className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-lg border border-slate-150">
                        <div className="flex items-center gap-2">
                          {m.tipo === 'ingreso_manual' ? (
                            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                          )}
                          <span className="font-medium text-slate-700">{m.motivo}</span>
                        </div>
                        <span className={`font-mono font-extrabold ${m.tipo === 'ingreso_manual' ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {m.tipo === 'ingreso_manual' ? '+' : '-'}{formatMoney(m.monto)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cash Audit Box & User Input */}
              <form onSubmit={handleConfirmClose} className="bg-slate-900 text-white rounded-2xl p-5 space-y-4 shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      {lang === 'es' ? 'Efectivo Esperado en Cajón' : 'Expected Cash in Drawer'}
                    </span>
                    <span className="text-2xl font-black font-mono text-emerald-400">{formatMoney(efectivoEsperado)}</span>
                  </div>

                  <div className="w-full sm:w-56 space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">
                      {lang === 'es' ? 'Efectivo Real Contado' : 'Actual Counted Cash'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={efectivoReal}
                      onChange={(e) => setEfectivoReal(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono font-bold text-sm focus:outline-none focus:border-blue-500 transition-all text-right"
                    />
                  </div>
                </div>

                {/* Discrepancy Indicator Banner */}
                {efectivoReal !== '' && (
                  <div className="pt-1">
                    {Math.abs(diferencia) < 0.01 ? (
                      <div className="bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>{lang === 'es' ? 'Cuadre Perfecto — Sin Descuadre' : 'Perfect Audit — No Discrepancy'}</span>
                        </span>
                        <span className="font-mono">{formatMoney(0)}</span>
                      </div>
                    ) : diferencia < 0 ? (
                      <div className="bg-rose-950/80 border border-rose-700/80 text-rose-300 px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-rose-400" />
                          <span>{lang === 'es' ? 'Faltante en Caja' : 'Deficit in Drawer'}</span>
                        </span>
                        <span className="font-mono font-black text-rose-300">-{formatMoney(Math.abs(diferencia))}</span>
                      </div>
                    ) : (
                      <div className="bg-amber-950/80 border border-amber-700/80 text-amber-300 px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-amber-400" />
                          <span>{lang === 'es' ? 'Sobrante en Caja' : 'Surplus in Drawer'}</span>
                        </span>
                        <span className="font-mono font-black text-amber-300">+{formatMoney(diferencia)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    {lang === 'es' ? 'Cancelar' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={closing}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold shadow-md shadow-rose-600/30 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {closing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>{lang === 'es' ? 'Confirmar Cierre de Turno' : 'Confirm Close Turn'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
