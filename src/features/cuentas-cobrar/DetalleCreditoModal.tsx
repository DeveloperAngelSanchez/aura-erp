import React, { useEffect, useState } from 'react';
import { X, Calendar, DollarSign, Clock, Receipt, User, CheckCircle2, ExternalLink, Loader2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { type CreditoVenta, type VentaCuota, type VentaAbono, fetchDetalleCredito } from './cuentasCobrarService';

interface DetalleCreditoModalProps {
  venta: CreditoVenta;
  onClose: () => void;
  onOpenAbonar: () => void;
}

export const DetalleCreditoModal: React.FC<DetalleCreditoModalProps> = ({
  venta,
  onClose,
  onOpenAbonar,
}) => {
  const { lang } = useLanguage();
  const moneda = venta.moneda || 'S/.';

  const [loading, setLoading] = useState<boolean>(true);
  const [cuotas, setCuotas] = useState<VentaCuota[]>([]);
  const [abonos, setAbonos] = useState<VentaAbono[]>([]);
  const [activeTab, setActiveTab] = useState<'cuotas' | 'abonos'>('cuotas');

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchDetalleCredito(venta.id);
        if (isMounted) {
          setCuotas(data.cuotas);
          setAbonos(data.abonos);
        }
      } catch (err) {
        console.error('Error loading credit details:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [venta.id]);

  const pctPagado = venta.total > 0 ? Math.min(100, Math.round((venta.monto_pagado / venta.total) * 100)) : 0;

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

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString(lang === 'es' ? 'es-PE' : 'en-US', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl max-h-[90dvh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Receipt className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  {lang === 'es' ? 'Expediente de Crédito' : 'Credit Ledger'}
                </h3>
                <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                  #{venta.correlativo ? String(venta.correlativo).padStart(8, '0') : venta.id.slice(-8).toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-bold text-slate-700">{venta.cliente_nombre || 'Cliente'}</span>
                <span>•</span>
                <span>{formatDate(venta.creado_en)}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Resumen & Barra de Progreso */}
        <div className="p-5 bg-gradient-to-br from-slate-50 to-blue-50/30 border-b border-slate-200/80 shrink-0">
          <div className="grid grid-cols-3 gap-3 text-center mb-3">
            <div className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                {lang === 'es' ? 'Total Venta' : 'Total'}
              </span>
              <span className="text-sm font-extrabold text-slate-800">
                {moneda} {venta.total.toFixed(2)}
              </span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                {lang === 'es' ? 'Cobrado' : 'Collected'}
              </span>
              <span className="text-sm font-extrabold text-emerald-600">
                {moneda} {venta.monto_pagado.toFixed(2)}
              </span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-blue-200/60 shadow-2xs bg-blue-50/30">
              <span className="text-[10px] uppercase font-bold text-blue-600 block mb-0.5">
                {lang === 'es' ? 'Saldo Pendiente' : 'Balance'}
              </span>
              <span className="text-sm font-extrabold text-blue-700">
                {moneda} {venta.saldo_pendiente.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Barra de progreso */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-bold">
              <span className="text-slate-500">{lang === 'es' ? 'Progreso de Cobro' : 'Payment Progress'}</span>
              <span className={pctPagado === 100 ? 'text-emerald-600' : 'text-blue-600'}>{pctPagado}%</span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  pctPagado === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                }`}
                style={{ width: `${pctPagado}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-6 shrink-0 bg-white">
          <button
            onClick={() => setActiveTab('cuotas')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'cuotas'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{lang === 'es' ? 'Plan de Cuotas' : 'Installments'}</span>
            <span className="ml-1 text-[10px] bg-slate-100 px-1.5 py-0.2 rounded-full font-extrabold">
              {cuotas.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('abonos')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'abonos'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{lang === 'es' ? 'Historial de Abonos' : 'Payment History'}</span>
            <span className="ml-1 text-[10px] bg-slate-100 px-1.5 py-0.2 rounded-full font-extrabold">
              {abonos.length}
            </span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
              <span>{lang === 'es' ? 'Cargando información...' : 'Loading...'}</span>
            </div>
          ) : activeTab === 'cuotas' ? (
            cuotas.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs italic">
                {lang === 'es' ? 'No se programaron cuotas específicas (Crédito abierto/global).' : 'No specific installments set.'}
              </div>
            ) : (
              <div className="space-y-2.5">
                {cuotas.map((c) => {
                  const isPagada = c.estado === 'pagada' || c.monto_pagado >= c.monto;
                  const isParcial = c.estado === 'parcial' || (c.monto_pagado > 0 && !isPagada);
                  return (
                    <div
                      key={c.id}
                      className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                        isPagada 
                          ? 'bg-emerald-50/40 border-emerald-200/80 text-emerald-900'
                          : isParcial
                            ? 'bg-amber-50/40 border-amber-200/80 text-amber-900'
                            : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-extrabold text-xs shrink-0 ${
                          isPagada
                            ? 'bg-emerald-100 text-emerald-700'
                            : isParcial
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                        }`}>
                          {c.numero_cuota}
                        </div>
                        <div>
                          <div className="font-bold text-xs">
                            {lang === 'es' ? 'Cuota' : 'Installment'} #{c.numero_cuota}
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium">
                            {lang === 'es' ? 'Vence:' : 'Due:'} {formatDate(c.fecha_vencimiento)}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-bold text-xs">
                          {moneda} {c.monto.toFixed(2)}
                        </div>
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold capitalize ${
                          isPagada
                            ? 'bg-emerald-100 text-emerald-800'
                            : isParcial
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                        }`}>
                          {isPagada 
                            ? (lang === 'es' ? 'Pagada' : 'Paid') 
                            : isParcial 
                              ? (lang === 'es' ? `Abonado ${moneda} ${c.monto_pagado.toFixed(2)}` : `Paid ${moneda} ${c.monto_pagado.toFixed(2)}`)
                              : (lang === 'es' ? 'Pendiente' : 'Pending')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            abonos.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs italic">
                {lang === 'es' ? 'Aún no se han registrado abonos para este crédito.' : 'No payments recorded yet.'}
              </div>
            ) : (
              <div className="space-y-2.5">
                {abonos.map((a) => (
                  <div key={a.id} className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 font-mono">
                          +{moneda} {a.monto.toFixed(2)}
                        </span>
                        <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-extrabold capitalize border border-blue-100">
                          {a.metodo_pago.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {formatDateTime(a.creado_en)} {a.usuario_nombre ? `• ${a.usuario_nombre}` : ''}
                      </div>
                      {a.notas && (
                        <div className="text-[11px] text-slate-600 italic mt-1">
                          "{a.notas}"
                        </div>
                      )}
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3 shrink-0">
          <a
            href={`/ticket/${venta.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 hover:text-blue-600 hover:bg-white rounded-xl border border-slate-200 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>{lang === 'es' ? 'Ver Ticket Digital' : 'View Digital Ticket'}</span>
          </a>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {lang === 'es' ? 'Cerrar' : 'Close'}
            </button>
            {venta.saldo_pendiente > 0 && (
              <button
                onClick={() => {
                  onClose();
                  onOpenAbonar();
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <DollarSign className="w-4 h-4" />
                <span>{lang === 'es' ? 'Abonar a Deuda' : 'Make Payment'}</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
