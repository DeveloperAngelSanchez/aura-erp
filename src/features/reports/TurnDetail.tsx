import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../api/supabaseClient';
import { useLanguage } from '../../context/LanguageContext';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { useEmpresa } from '../../context/EmpresaContext';
import { ReassignSalesModal } from './ReassignSalesModal';
import { POSTerminal } from '../pos/POSTerminal';
import {
  ArrowLeft,
  TrendingUp,
  Clock,
  User,
  Receipt,
  Banknote,
  CreditCard,
  ArrowRightLeft,
  Smartphone,
  Plus,
  Unlink,
  ShoppingCart,
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
  es_manual?: boolean;
  notas_auditoria?: string;
}

interface SaleRecord {
  id: string;
  correlativo: number | null;
  total: number;
  metodo_pago: string;
  creado_en: string;
  cliente_nombre: string | null;
  barbero_nombre: string | null;
  items_detalle?: string | null;
  venta_pagos: { metodo_pago: string; monto: number }[];
}

const translations = {
  es: {
    back: 'Volver a Turnos',
    title: 'Detalle del Turno',
    openedBy: 'Abierto por',
    openedAt: 'Apertura',
    closedAt: 'Cierre',
    duration: 'Duración',
    openingCash: 'Monto Apertura',
    totalSales: 'Ventas Totales',
    cashInRegister: 'Efectivo en Caja',
    cashSales: 'Ventas Efectivo',
    avgTicket: 'Ticket Promedio',
    qtySales: 'Cantidad de Ventas',
    salesTitle: 'Ventas del Turno',
    ticketId: 'Ticket',
    date: 'Fecha',
    customer: 'Cliente',
    barbero: 'Barbero',
    items: 'Items',
    method: 'Pago',
    total: 'Total',
    noSales: 'No se registraron ventas en este turno.',
    loading: 'Cargando detalle del turno...',
    hours: 'hrs',
    paymentMethods: 'Desglose por Método de Pago',
    manualMovements: 'Movimientos Manuales',
    income: 'Ingresos',
    expenses: 'Egresos',
  },
  en: {
    back: 'Back to Shifts',
    title: 'Turn Detail',
    openedBy: 'Opened by',
    openedAt: 'Opened',
    closedAt: 'Closed',
    duration: 'Duration',
    openingCash: 'Opening Cash',
    totalSales: 'Total Sales',
    cashInRegister: 'Cash in Register',
    cashSales: 'Cash Sales',
    avgTicket: 'Avg Ticket',
    qtySales: 'Sales Count',
    salesTitle: 'Turn Sales',
    ticketId: 'Ticket',
    date: 'Date',
    customer: 'Customer',
    barbero: 'Barber',
    items: 'Items',
    method: 'Payment',
    total: 'Total',
    noSales: 'No sales recorded in this turn.',
    loading: 'Loading turn detail...',
    hours: 'hrs',
    paymentMethods: 'Payment Method Breakdown',
    manualMovements: 'Manual Movements',
    income: 'Income',
    expenses: 'Expenses',
  },
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

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

const methodLabels: Record<string, { es: string; en: string }> = {
  efectivo: { es: 'Efectivo', en: 'Cash' },
  tarjeta: { es: 'Tarjeta', en: 'Card' },
  transferencia: { es: 'Transferencia', en: 'Transfer' },
};

interface TurnDetailProps {
  turnId: string;
  onBack: () => void;
}

export const TurnDetail: React.FC<TurnDetailProps> = ({ turnId, onBack }) => {
  const { profile } = useAuth();
  const { lang } = useLanguage();
  const { formatMoney } = useSettings();
  const { rubroConfig } = useEmpresa();
  const t = translations[lang];

  const isAdmin = profile?.rol === 'admin' || profile?.rol_sistema === 'sistema_admin';

  const [turn, setTurn] = useState<CloseRecord | null>(null);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [metodosMap, setMetodosMap] = useState<Record<string, number>>({});
  const [manualIncomes, setManualIncomes] = useState(0);
  const [manualExpenses, setManualExpenses] = useState(0);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [isPOSHistoricalModeOpen, setIsPOSHistoricalModeOpen] = useState(false);

  useEffect(() => {
    loadTurnDetail(turnId);
  }, [turnId]);

  const handleUnlinkSale = async (saleId: string) => {
    if (!window.confirm('¿Está seguro de desvincular esta venta del turno? Permanece como venta activa sin turno.')) {
      return;
    }
    try {
      const { error: rpcErr } = await supabase.rpc('desvincular_venta_de_turno_atomico', {
        p_venta_id: saleId,
        p_usuario_id: profile?.id || null,
      });

      if (rpcErr) throw rpcErr;

      loadTurnDetail(turnId);
    } catch (err: any) {
      console.error('Error unlinking sale:', err);
      alert('Ocurrió un error al desvincular la venta: ' + err.message);
    }
  };

  const loadTurnDetail = async (turnId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data: turnData, error: turnErr } = await supabase
        .from('vista_reporte_cierres_turno')
        .select('*')
        .eq('id', turnId)
        .single();

      if (turnErr) throw turnErr;
      setTurn(turnData as CloseRecord);

      const { data: salesData, error: salesErr } = await supabase
        .from('ventas')
        .select('id, total, metodo_pago, creado_en, correlativo, cliente_nombre, barbero:perfiles!ventas_barbero_id_fkey(nombre), venta_pagos(metodo_pago, monto)')
        .eq('turno_id', turnId)
        .eq('estado', 'completada')
        .order('creado_en', { ascending: false });

      if (salesErr) throw salesErr;
      const processedSales = (salesData || []).map((s: any) => ({
        ...s,
        barbero_nombre: s.barbero?.nombre || null,
      }));
      setSales(processedSales);

      const metodos: Record<string, number> = {};
      let inc = 0;
      let exp = 0;

      (salesData || []).forEach((sale) => {
        const pagos = sale.venta_pagos || [];
        if (pagos.length > 0) {
          pagos.forEach((pago) => {
            const mName = pago.metodo_pago.trim().toLowerCase();
            metodos[mName] = (metodos[mName] || 0) + (pago.monto || 0);
          });
        } else {
          const mName = sale.metodo_pago.trim().toLowerCase();
          metodos[mName] = (metodos[mName] || 0) + (sale.total || 0);
        }
      });

      const { data: movsData } = await supabase
        .from('caja_movimientos')
        .select('tipo, monto, motivo')
        .eq('turno_id', turnId);

      (movsData || []).forEach((m) => {
        if (m.tipo === 'ingreso_manual') inc += m.monto;
        else if (m.tipo === 'egreso_manual' && (!m.motivo || !m.motivo.startsWith('Anulación venta'))) exp += m.monto;
      });

      setMetodosMap(metodos);
      setManualIncomes(inc);
      setManualExpenses(exp);
    } catch (err: any) {
      console.error('Error loading turn detail:', err);
      setError(err.message || 'Error al cargar el detalle del turno');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 text-slate-400 text-sm">
        <span className="w-6 h-6 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin inline-block mr-2 align-middle"></span>
        {t.loading}
      </div>
    );
  }

  if (error || !turn) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-800 p-6 rounded-xl text-sm">
        {error || 'Turno no encontrado'}
      </div>
    );
  }

  const methodEntries = Object.entries(metodosMap).sort(([, a], [, b]) => b - a);

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        {t.back}
      </button>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 border border-blue-100 text-blue-600 rounded-xl">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                {t.title}
                <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">
                  #{turn.id.slice(0, 8).toUpperCase()}
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                {turn.usuario_nombre}
                <span className="text-slate-300 mx-1">·</span>
                {turn.sucursal_nombre}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.duration}</p>
            <p className="text-sm font-extrabold text-slate-800 font-mono">
              {turn.duracion_horas !== null ? `${turn.duracion_horas.toFixed(1)} ${t.hours}` : '—'}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 text-xs text-slate-600 border-t border-slate-100 pt-4">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold">{t.openedAt}:</span>
            <span className="font-mono font-bold">{formatDate(turn.abierto_en)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold">{t.closedAt}:</span>
            <span className="font-mono font-bold">{turn.cerrado_en ? formatDate(turn.cerrado_en) : '—'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs space-y-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.openingCash}</span>
          <p className="text-xl font-black text-slate-900 font-mono">{formatMoney(turn.monto_apertura)}</p>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs space-y-1.5">
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">{t.totalSales}</span>
          <p className="text-xl font-black text-blue-700 font-mono">{formatMoney(turn.total_ventas)}</p>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs space-y-1.5">
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">{t.cashInRegister}</span>
          <p className="text-xl font-black text-amber-700 font-mono">
            {formatMoney(turn.monto_apertura + turn.total_efectivo + manualIncomes - manualExpenses)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs space-y-1.5">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">{t.cashSales}</span>
          <p className="text-xl font-black text-emerald-700 font-mono flex items-center gap-1.5">
            {formatMoney(turn.total_efectivo)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs space-y-1.5">
          <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">{t.avgTicket}</span>
          <p className="text-xl font-black text-purple-700 font-mono flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4" />
            {turn.cantidad_ventas > 0 ? formatMoney(turn.total_ventas / turn.cantidad_ventas) : formatMoney(0)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs space-y-1.5">
          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">{t.qtySales}</span>
          <p className="text-xl font-black text-indigo-700 font-mono">{turn.cantidad_ventas}</p>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs space-y-1.5">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">{t.income}</span>
          <p className="text-xl font-black text-emerald-700 font-mono">+{formatMoney(manualIncomes)}</p>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs space-y-1.5">
          <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">{t.expenses}</span>
          <p className="text-xl font-black text-rose-700 font-mono">-{formatMoney(manualExpenses)}</p>
        </div>
      </div>

      {methodEntries.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            {t.paymentMethods}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {methodEntries.map(([metodo, monto]) => (
              <div key={metodo} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getMetodoIcon(metodo)}
                  <span className="text-xs font-extrabold text-slate-800 capitalize">{metodo}</span>
                </div>
                <span className="text-xs font-black font-mono text-slate-900">{formatMoney(monto)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">{t.salesTitle}</h2>
            <span className="text-[10px] text-slate-400 font-medium ml-2">
              ({sales.length} {lang === 'es' ? 'ventas' : 'sales'})
            </span>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPOSHistoricalModeOpen(true)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Agregar Ventas desde el POS</span>
              </button>

              <button
                onClick={() => setIsReassignModalOpen(true)}
                className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Anexar Ventas Existentes</span>
              </button>
            </div>
          )}
        </div>

        {sales.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs italic">{t.noSales}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/90 text-slate-500 uppercase tracking-wider font-extrabold border-b border-slate-200 select-none">
                  <th className="py-3 px-3 whitespace-nowrap">{t.ticketId}</th>
                  <th className="py-3 px-3 whitespace-nowrap">{t.date}</th>
                  <th className="py-3 px-3 whitespace-nowrap">{t.customer}</th>
                  <th className="py-3 px-3 whitespace-nowrap">{rubroConfig.labels.salesRoleHeader}</th>
                  <th className="py-3 px-3 whitespace-nowrap">{t.method}</th>
                  <th className="py-3 px-3 text-right whitespace-nowrap">{t.total}</th>
                  {isAdmin && <th className="py-3 px-3 text-center whitespace-nowrap">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sales.map((sale) => {
                  const metodo = sale.venta_pagos?.[0]?.metodo_pago || sale.metodo_pago;
                  return (
                    <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-3 py-3 font-mono font-bold text-slate-800">
                        #{sale.correlativo ? sale.correlativo.toString().padStart(8, '0') : sale.id.slice(-8).toUpperCase()}
                      </td>
                      <td className="px-3 py-3 text-slate-600 font-medium whitespace-nowrap">
                        {new Date(sale.creado_en).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-3 py-3 text-slate-700 font-medium truncate max-w-[150px]">
                        <span className="flex items-center gap-1.5">
                          <User className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{sale.cliente_nombre || (lang === 'es' ? 'General' : 'General')}</span>
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-700 font-medium truncate max-w-[120px]">
                        <span className="flex items-center gap-1.5">
                          <User className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{sale.barbero_nombre || '—'}</span>
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1 capitalize">
                          {getMetodoIcon(metodo)}
                          <span>{methodLabels[metodo]?.[lang as keyof typeof methodLabels['efectivo']] || metodo}</span>
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-blue-600">
                        {formatMoney(sale.total)}
                      </td>
                      {isAdmin && (
                        <td className="px-3 py-3 text-center">
                          <button
                            onClick={() => handleUnlinkSale(sale.id)}
                            title="Desvincular venta del turno"
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          >
                            <Unlink className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ReassignSalesModal
        isOpen={isReassignModalOpen}
        onClose={() => setIsReassignModalOpen(false)}
        preselectedTurnId={turnId}
        onSuccess={() => loadTurnDetail(turnId)}
      />

      {isPOSHistoricalModeOpen && createPortal(
        <div className="fixed inset-0 z-[60] bg-white overflow-hidden w-screen h-screen flex flex-col">
          <POSTerminal
            historicalTurnId={turn.id}
            historicalTurnData={{
              id: turn.id,
              sucursal_id: turn.sucursal_id,
              usuario_id: turn.usuario_id,
              usuario_nombre: turn.usuario_nombre,
              sucursal_nombre: turn.sucursal_nombre,
              abierto_en: turn.abierto_en,
              cerrado_en: turn.cerrado_en,
            }}
            onCloseHistoricalMode={() => {
              setIsPOSHistoricalModeOpen(false);
              loadTurnDetail(turnId);
            }}
          />
        </div>,
        document.body
      )}
    </div>
  );
};
