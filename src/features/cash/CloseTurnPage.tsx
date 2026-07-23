import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../api/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useCash } from '../../context/CashContext';
import { useLanguage } from '../../context/LanguageContext';
import { useSettings } from '../../context/SettingsContext';
import {
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowLeft,
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
  X,
  ChevronDown,
} from 'lucide-react';

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

export const CloseTurnPage: React.FC = () => {
  const { lang } = useLanguage();
  const { profile } = useAuth();
  const { formatMoney } = useSettings();
  const { activeTurn, closeTurn } = useCash();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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

  const [detallesMetodosMap, setDetallesMetodosMap] = useState<Record<string, PagoDetallado[]>>({});
  const [selectedMetodo, setSelectedMetodo] = useState<string | null>(null);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

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
      if (!activeTurn) {
        setLoading(false);
        return;
      }
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
        setSuccessMsg(lang === 'es' ? '¡Turno de caja cerrado con éxito!' : 'Cash turn closed successfully!');
        setTimeout(() => {
          navigate('/pos');
        }, 1500);
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

  if (!activeTurn && !loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-800">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-sm">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
          <h2 className="text-base font-extrabold text-slate-900">
            {lang === 'es' ? 'No hay ningún turno de caja abierto' : 'No active cash shift'}
          </h2>
          <p className="text-xs text-slate-500">
            {lang === 'es' ? 'Debes abrir una caja registradora en el POS antes de realizar un cierre.' : 'You need an active turn to close.'}
          </p>
          <button
            onClick={() => navigate('/pos')}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all cursor-pointer"
          >
            {lang === 'es' ? 'Ir al POS' : 'Go to POS'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/pos')}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{lang === 'es' ? 'Volver al POS' : 'Back to POS'}</span>
          </button>
          <div className="h-5 w-px bg-slate-200" />
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Aura" className="h-6 w-auto object-contain" />
            <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
              {lang === 'es' ? 'Cierre Enterprise de Caja' : 'Enterprise Shift Close'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{lang === 'es' ? 'Cajero' : 'Cashier'}</span>
            <span className="text-xs font-extrabold text-slate-800">{profile?.nombre || 'Usuario'}</span>
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-sm font-bold flex items-center gap-2.5 shadow-sm animate-in fade-in zoom-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {pendingApprovalsCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-xl text-xs font-semibold flex items-center gap-3 shadow-sm">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
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
          <div className="bg-white border border-slate-200 rounded-2xl p-16 flex items-center justify-center space-x-3 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-sm font-semibold">{lang === 'es' ? 'Calculando auditoría de caja...' : 'Calculating cash audit...'}</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left 2 Columns: KPI Cards, Payment breakdown, Manual movements */}
            <div className="lg:col-span-2 space-y-6">
              {/* KPI Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {lang === 'es' ? 'Efectivo Apertura' : 'Opening Cash'}
                  </span>
                  <span className="text-base font-black text-slate-900 font-mono">{formatMoney(montoApertura)}</span>
                </div>

                <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
                    {lang === 'es' ? 'Ventas Efectivo' : 'Cash Sales'}
                  </span>
                  <span className="text-base font-black text-emerald-700 font-mono">+{formatMoney(totalVentasEfectivo)}</span>
                </div>

                <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                    {lang === 'es' ? 'Ingresos Manuales' : 'Manual Incomes'}
                  </span>
                  <span className="text-base font-black text-blue-700 font-mono">+{formatMoney(totalIngresosManuales)}</span>
                </div>

                <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">
                    {lang === 'es' ? 'Egresos Manuales' : 'Manual Expenses'}
                  </span>
                  <span className="text-base font-black text-rose-700 font-mono">-{formatMoney(totalEgresosManuales)}</span>
                </div>
              </div>

              {/* Payment Methods Breakdown */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <span className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <CreditCard className="w-4.5 h-4.5 text-blue-600" />
                    <span>{lang === 'es' ? 'Desglose de Ventas por Método de Pago' : 'Sales by Payment Method'}</span>
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-700">
                    {lang === 'es' ? 'Total General' : 'Grand Total'}: <strong className="font-extrabold text-slate-900">{formatMoney(totalVentasGeneral)}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                          className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-600/20 shadow-sm'
                              : 'bg-slate-50 hover:bg-blue-50/40 border-slate-200 hover:border-blue-300'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full mb-1.5">
                            <span className="text-xs font-extrabold text-slate-800 capitalize flex items-center gap-1.5">
                              {getMetodoIcon(v.metodo)}
                              <span>{v.metodo}</span>
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
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
                  <div className="bg-slate-50/90 border border-blue-200 rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
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
                        <span className="text-xs font-extrabold font-mono text-blue-700 bg-blue-100/80 px-2.5 py-1 rounded-lg">
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

                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {(!detallesMetodosMap[selectedMetodo] || detallesMetodosMap[selectedMetodo].length === 0) ? (
                        <p className="text-xs text-slate-400 italic py-3 text-center">{lang === 'es' ? 'No se encontraron registros' : 'No records found'}</p>
                      ) : (
                        detallesMetodosMap[selectedMetodo].map((tx, idx) => (
                          <div key={`${tx.saleId}-${idx}`} className="bg-white border border-slate-200/90 rounded-xl p-3 flex items-center justify-between shadow-2xs hover:border-blue-200 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0 border border-blue-100">
                                <Receipt className="w-4 h-4" />
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
                                <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                                  <User className="w-3 h-3 text-slate-400" />
                                  <span>{tx.cliente_nombre || (lang === 'es' ? 'Cliente General' : 'General Customer')}</span>
                                </p>
                              </div>
                            </div>
                            <span className="text-xs font-black font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60">
                              +{formatMoney(tx.monto)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Manual Cash Movements */}
              {movimientos.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-2xs">
                  <span className="text-sm font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Scale className="w-4.5 h-4.5 text-purple-600" />
                    <span>{lang === 'es' ? 'Movimientos Manuales de Caja' : 'Manual Cash Movements'}</span>
                  </span>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {movimientos.map((m) => (
                      <div key={m.id} className="flex items-center justify-between text-xs bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                        <div className="flex items-center gap-2">
                          {m.tipo === 'ingreso_manual' || m.tipo === 'ingreso_venta' ? (
                            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4 text-rose-600" />
                          )}
                          <span className="font-semibold text-slate-800">{m.motivo}</span>
                        </div>
                        <span className={`font-mono font-extrabold ${m.tipo === 'ingreso_manual' || m.tipo === 'ingreso_venta' ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {m.tipo === 'ingreso_manual' || m.tipo === 'ingreso_venta' ? '+' : '-'}{formatMoney(m.monto)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Arqueo & Cuadre Card in pure Aura Light Theme */}
            <div className="lg:col-span-1">
              <form onSubmit={handleConfirmClose} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-sm sticky top-24">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                  <div className="p-2 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">{lang === 'es' ? 'Arqueo & Cuadre de Caja' : 'Cash Audit'}</h3>
                    <p className="text-[11px] text-slate-400 font-medium">{lang === 'es' ? 'Conteo físico en cajón' : 'Physical drawer count'}</p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl space-y-1">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    {lang === 'es' ? 'Efectivo Esperado Teórico' : 'Expected Cash'}
                  </span>
                  <span className="text-2xl font-black font-mono text-slate-900 block">{formatMoney(efectivoEsperado)}</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    {lang === 'es' ? 'Efectivo Real Contado' : 'Counted Cash'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={efectivoReal}
                    onChange={(e) => setEfectivoReal(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 focus:outline-none transition-all font-mono font-extrabold text-base text-right text-slate-900"
                  />
                </div>

                {/* Discrepancy Indicator Banner */}
                {efectivoReal !== '' && (
                  <div>
                    {Math.abs(diferencia) < 0.01 ? (
                      <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl text-xs font-bold flex justify-between items-center">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>{lang === 'es' ? 'Cuadre Perfecto' : 'Perfect Audit'}</span>
                        </span>
                        <span className="font-mono font-extrabold">{formatMoney(0)}</span>
                      </div>
                    ) : diferencia < 0 ? (
                      <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl text-xs font-bold flex justify-between items-center">
                        <span className="flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-rose-600" />
                          <span>{lang === 'es' ? 'Faltante en Caja' : 'Deficit'}</span>
                        </span>
                        <span className="font-mono font-extrabold">-{formatMoney(Math.abs(diferencia))}</span>
                      </div>
                    ) : (
                      <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3.5 rounded-xl text-xs font-bold flex justify-between items-center">
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-amber-600" />
                          <span>{lang === 'es' ? 'Sobrante en Caja' : 'Surplus'}</span>
                        </span>
                        <span className="font-mono font-extrabold">+{formatMoney(diferencia)}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  <button
                    type="submit"
                    disabled={closing}
                    className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs shadow-md shadow-rose-600/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {closing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>{lang === 'es' ? 'Confirmar y Cerrar Turno' : 'Confirm & Close Turn'}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/pos')}
                    className="w-full py-2.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    {lang === 'es' ? 'Cancelar y Volver' : 'Cancel & Return'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
