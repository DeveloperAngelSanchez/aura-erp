import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../api/supabaseClient';
import { useLanguage } from '../../context/LanguageContext';
import { useSettings } from '../../context/SettingsContext';
import { useCash } from '../../context/CashContext';
import { usePermission } from '../../context/PermissionsContext';
import { useEmpresa } from '../../context/EmpresaContext';
import { AlertCircle, History, X, Loader2, XCircle, CheckCircle2, Calendar, ChevronDown, User } from 'lucide-react';
import { AnulationModal } from '../sales/AnulationModal';

interface Venta {
  id: string;
  correlativo?: number | null;
  total: number;
  creado_en: string;
  estado: string;
  barbero_id?: string | null;
  barbero?: { nombre: string } | null;
  usuario?: { nombre: string } | null;
  venta_pagos: { metodo_pago: string; monto: number }[];
  venta_detalles: { cantidad: number; precio_unitario: number; items: { nombre: string } }[];
}

interface Props {
  onClose: () => void;
  historicalTurnId?: string;
}

const formatDateTimeString = (iso: string, lang: 'es' | 'en') => {
  if (!iso) return '';
  const date = new Date(iso);
  
  const dayName = date.toLocaleDateString(lang === 'es' ? 'es-PE' : 'en-US', { weekday: 'short' });
  const dayNum = date.getDate();
  const monthName = date.toLocaleDateString(lang === 'es' ? 'es-PE' : 'en-US', { month: 'short' });
  const timeStr = date.toLocaleTimeString(lang === 'es' ? 'es-PE' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const capDay = dayName.charAt(0).toUpperCase() + dayName.slice(1).replace('.', '');
  const capMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1).replace('.', '');

  return `${capDay} ${dayNum} ${capMonth}. ${timeStr}`;
};

export const SalesHistoryModal: React.FC<Props> = ({ onClose, historicalTurnId }) => {
  const { lang } = useLanguage();
  const { formatMoney } = useSettings();
  const { activeTurn } = useCash();
  const { rubroConfig } = useEmpresa();
  const canAnular = usePermission('anular_venta');

  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [anulationTarget, setAnulationTarget] = useState<{ id: string; total: number } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const targetTurnId = historicalTurnId || activeTurn?.id;

  useEffect(() => {
    const load = async () => {
      if (!targetTurnId) {
        setVentas([]);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const { data, error: err } = await supabase
          .from('ventas')
          .select('*, barbero:perfiles!ventas_barbero_id_fkey(nombre), usuario:perfiles!ventas_usuario_id_fkey(nombre), venta_pagos(metodo_pago, monto), venta_detalles(cantidad, precio_unitario, items(nombre))')
          .eq('turno_id', targetTurnId)
          .eq('estado', 'completada')
          .order('creado_en', { ascending: false });

        if (err) throw err;
        setVentas(data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [targetTurnId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div 
      onClick={onClose}
      className="fixed inset-0 z-[80] bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-205"
      >
        <div className="flex justify-between items-center border-b border-slate-100 px-6 py-4 shrink-0">
          <h2 className="text-sm font-bold text-slate-950 flex items-center gap-2">
            <History className="w-4.5 h-4.5 text-blue-600" />
            <span>{lang === 'es' ? 'Historial de Ventas' : 'Sales History'}</span>
          </h2>
          <button onClick={onClose}
            className="text-slate-400 hover:text-slate-600 focus:outline-none">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs flex items-center gap-2 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-sm">{lang === 'es' ? 'Cargando...' : 'Loading...'}</span>
            </div>
          ) : error ? (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs flex items-center gap-1.5 shadow-sm">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>{error}</span>
            </div>
          ) : ventas.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-slate-400">
                {lang === 'es' ? 'No hay ventas registradas en este turno.' : 'No sales recorded in this shift.'}
              </p>
            </div>
          ) : (
            ventas.map((v) => {
              const isExpanded = expandedId === v.id;
              const metodosStr = (v.venta_pagos || [])
                .map((m) => `${m.metodo_pago}: ${formatMoney(m.monto)}`)
                .join(', ');
              const barberName = v.barbero?.nombre || v.usuario?.nombre || '—';

              return (
                <div key={v.id} className="bg-white border border-slate-200 rounded-xl p-4 transition-all shadow-xs hover:border-slate-300">
                  {/* Header Row: Ticket Correlativo, Date & Action */}
                  <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100 text-xs text-slate-500">
                    <div className="flex items-center gap-2 font-medium text-slate-600">
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md text-[11px]">
                        Ticket #{String(v.correlativo || 0).padStart(8, '0')}
                      </span>
                      <span className="text-slate-300">•</span>
                      <div className="flex items-center gap-1 text-slate-500">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDateTimeString(v.creado_en, lang)}</span>
                      </div>
                    </div>

                    {canAnular && v.estado === 'completada' && (
                      <button
                        onClick={() => setAnulationTarget({ id: v.id, total: v.total })}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title={lang === 'es' ? 'Anular venta' : 'Annul sale'}
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Main Content Row */}
                  <div className="flex items-center justify-between gap-4">
                    {/* Left: Barber & Payment */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-purple-600" />
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{rubroConfig.labels.salesRoleHeader}:</span>
                        <span className="text-sm font-extrabold text-slate-900">{barberName}</span>
                      </div>
                      <div className="text-xs text-slate-500 font-medium capitalize">
                        {metodosStr}
                      </div>
                    </div>

                    {/* Right: Total & Expand Link */}
                    <div className="text-right space-y-1">
                      <span className="block font-mono font-black text-lg text-slate-900 tracking-tight">{formatMoney(v.total)}</span>
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : v.id)}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-700 transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>{isExpanded ? (lang === 'es' ? 'Ocultar detalles' : 'Hide details') : (lang === 'es' ? 'Ver detalles' : 'View details')}</span>
                        <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Items Drawer */}
                  {isExpanded && v.venta_detalles && (
                    <div className="border-t border-slate-100 pt-3 mt-3 space-y-2 bg-slate-50/80 p-3 rounded-xl">
                      {v.venta_detalles.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs text-slate-700">
                          <span className="font-semibold">{item.cantidad}x {item.items?.nombre || '?'}</span>
                          <span className="font-mono font-bold text-slate-900">{formatMoney(item.precio_unitario * item.cantidad)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-slate-100 p-4 shrink-0">
          <p className="text-[10px] text-slate-400 text-center">
            {ventas.length} {lang === 'es' ? 'venta(s) en este turno' : 'sale(s) in this shift'} | {lang === 'es' ? 'Total' : 'Total'}: {formatMoney(ventas.reduce((s, v) => s + v.total, 0))}
          </p>
        </div>
      </div>

      {anulationTarget && (
        <AnulationModal
          saleId={anulationTarget.id}
          saleTotal={anulationTarget.total}
          onClose={() => setAnulationTarget(null)}
          onSuccess={(msg) => {
            setSuccessMessage(msg);
            setVentas(prev => prev.map(v => v.id === anulationTarget.id ? { ...v, estado: 'anulada' } : v));
            setTimeout(() => setSuccessMessage(null), 4000);
          }}
        />
      )}
    </div>,
    document.body
  );
};
