import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../api/supabaseClient';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useEmpresa } from '../../context/EmpresaContext';
import {
  X,
  Receipt,
  User,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Calendar,
  DollarSign,
  Scissors,
  Save,
  Clock,
} from 'lucide-react';

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

interface PaymentRow {
  metodo_pago: string;
  monto: string;
}

interface BarberOption {
  id: string;
  nombre: string;
}

interface Props {
  sale: SaleRecord;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

const translations = {
  es: {
    title: 'Editar Venta',
    subtitle: 'Modifica los datos de la venta. Los cambios afectarán los registros de caja y pagos.',
    ticket: 'Ticket',
    sectionDate: 'Fecha y Cliente',
    date: 'Fecha de Venta',
    customer: 'Cliente',
    customerPlaceholder: 'Nombre del cliente',
    sectionBarber: 'Barbero Asignado',
    barberPlaceholder: 'Seleccionar barbero',
    noBarber: 'Sin barbero',
    sectionPayment: 'Métodos de Pago',
    paymentMethod: 'Método',
    amount: 'Monto',
    addPayment: 'Agregar Pago',
    totalLabel: 'Total',
    calculatedFromPayments: 'Calculado de los pagos',
    cancel: 'Cancelar',
    save: 'Guardar Cambios',
    saving: 'Guardando...',
    successMessage: 'Venta #%s actualizada correctamente',
    validationMinPayment: 'Debe haber al menos un método de pago.',
    validationAmount: 'Todos los montos deben ser mayores a 0.',
    errorFetch: 'Error al cargar datos de la venta.',
    errorSave: 'Error al guardar los cambios.',
    originalDate: 'fecha original',
  },
  en: {
    title: 'Edit Sale',
    subtitle: 'Modify sale data. Changes will affect cash register and payment records.',
    ticket: 'Ticket',
    sectionDate: 'Date & Customer',
    date: 'Sale Date',
    customer: 'Customer',
    customerPlaceholder: 'Customer name',
    sectionBarber: 'Assigned Barber',
    barberPlaceholder: 'Select barber',
    noBarber: 'No barber',
    sectionPayment: 'Payment Methods',
    paymentMethod: 'Method',
    amount: 'Amount',
    addPayment: 'Add Payment',
    totalLabel: 'Total',
    calculatedFromPayments: 'Calculated from payments',
    cancel: 'Cancel',
    save: 'Save Changes',
    saving: 'Saving...',
    successMessage: 'Sale #%s updated successfully',
    validationMinPayment: 'At least one payment method is required.',
    validationAmount: 'All amounts must be greater than 0.',
    errorFetch: 'Error loading sale data.',
    errorSave: 'Error saving changes.',
    originalDate: 'original date',
  },
};

const formatDateForInput = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const EditSaleModal: React.FC<Props> = ({ sale, onClose, onSuccess }) => {
  const { lang } = useLanguage();
  const { profile } = useAuth();
  const { impersonating, activeBranchIds } = useEmpresa();
  const t = translations[lang];

  const [barberos, setBarberos] = useState<BarberOption[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [barberoId, setBarberoId] = useState<string>('');
  const [clienteNombre, setClienteNombre] = useState('');
  const [creadoEn, setCreadoEn] = useState('');
  const [fechaEdited, setFechaEdited] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableMethods, setAvailableMethods] = useState<string[]>(['efectivo', 'tarjeta', 'transferencia']);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const branchIds = impersonating ? activeBranchIds : [profile?.sucursal_id];
      const targetBranch = branchIds[0];

      const [pagosRes, barberosRes, configRes] = await Promise.all([
        supabase.from('venta_pagos').select('metodo_pago, monto').eq('venta_id', sale.id),
        supabase.from('perfiles').select('id, nombre').in('sucursal_id', branchIds).eq('rol', 'barbero').eq('activo', true),
        supabase.from('configuraciones').select('metodos_pago').eq('sucursal_id', targetBranch).maybeSingle(),
      ]);

      if (pagosRes.data && pagosRes.data.length > 0) {
        setPayments(
          pagosRes.data.map((p: any) => ({
            metodo_pago: p.metodo_pago,
            monto: parseFloat(p.monto).toFixed(2),
          }))
        );
      } else {
        setPayments([{ metodo_pago: sale.metodo_pago === 'mixto' ? 'efectivo' : sale.metodo_pago, monto: sale.total.toFixed(2) }]);
      }

      setBarberos(barberosRes.data || []);

      if (configRes.data?.metodos_pago) {
        setAvailableMethods(configRes.data.metodos_pago);
      }

      if (sale.barbero_nombre && barberosRes.data) {
        const match = barberosRes.data.find((b: any) => b.nombre === sale.barbero_nombre);
        if (match) setBarberoId(match.id);
      }

      setClienteNombre(sale.cliente_nombre || '');
      setCreadoEn(formatDateForInput(sale.creado_en));
    } catch (err: any) {
      console.error('Error loading edit sale data:', err);
      setError(t.errorFetch);
    }
  };

  const syncBarberoId = (id: string) => {
    setBarberoId(id);
  };

  const handlePaymentChange = (index: number, field: keyof PaymentRow, value: string) => {
    const updated = [...payments];
    updated[index] = { ...updated[index], [field]: value };
    setPayments(updated);
  };

  const handleAddPayment = () => {
    const usedMethods = payments.map((p) => p.metodo_pago);
    const nextMethod = availableMethods.find((m) => !usedMethods.includes(m)) || availableMethods[0];
    setPayments([...payments, { metodo_pago: nextMethod, monto: '0.00' }]);
  };

  const handleRemovePayment = (index: number) => {
    if (payments.length <= 1) return;
    setPayments(payments.filter((_, i) => i !== index));
  };

  const totalCalculated = payments.reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (payments.length === 0) {
      setError(t.validationMinPayment);
      return;
    }

    const hasInvalid = payments.some((p) => parseFloat(p.monto) <= 0 || isNaN(parseFloat(p.monto)));
    if (hasInvalid) {
      setError(t.validationAmount);
      return;
    }

    setSubmitting(true);

    try {
      const pagosJson = payments.map((p) => ({
        metodo_pago: p.metodo_pago,
        monto: parseFloat(p.monto),
      }));

      const { error: rpcError } = await supabase.rpc('editar_venta_pos', {
        p_venta_id: sale.id,
        p_pagos: pagosJson,
        p_barbero_id: barberoId || null,
        p_cliente_nombre: clienteNombre.trim() || null,
        p_creado_en: fechaEdited ? new Date(creadoEn).toISOString() : null,
      });

      if (rpcError) throw rpcError;

      const ticketLabel = sale.correlativo
        ? sale.correlativo.toString().padStart(8, '0')
        : sale.id.slice(0, 8).toUpperCase();

      onSuccess(t.successMessage.replace('%s', ticketLabel));
      onClose();
    } catch (err: any) {
      console.error('Error editing sale:', err);
      setError(err.message || t.errorSave);
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <>
      <div onClick={onClose} className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200" />

      <div className="fixed inset-y-0 right-0 z-[100] w-full sm:max-w-xl bg-white shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300 border-l border-slate-200 h-screen">
        <div className="px-6 py-4 pt-[max(1rem,env(safe-area-inset-top))] border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-2xs">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-950 leading-tight">{t.title}</h2>
              <p className="text-xs text-slate-400 font-medium">
                {t.ticket} #{sale.correlativo ? sale.correlativo.toString().padStart(8, '0') : sale.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-slate-50/50">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl text-xs flex items-center gap-2 shadow-sm">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form id="edit-sale-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>{t.sectionDate}</span>
              </h3>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 block flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {t.date}
                  {!fechaEdited && (
                    <span className="text-[10px] text-slate-400 font-normal italic">({t.originalDate})</span>
                  )}
                </label>
                <input
                  type="datetime-local"
                  value={creadoEn}
                  onChange={(e) => { setCreadoEn(e.target.value); setFechaEdited(true); }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all text-xs font-mono font-medium shadow-2xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 block flex items-center gap-1.5">
                  <User className="w-3 h-3 text-slate-400" />
                  {t.customer}
                </label>
                <input
                  type="text"
                  placeholder={t.customerPlaceholder}
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all text-xs font-medium shadow-2xs placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                <Scissors className="w-3.5 h-3.5 text-blue-600" />
                <span>{t.sectionBarber}</span>
              </h3>

              <div className="space-y-1">
                <select
                  value={barberoId}
                  onChange={(e) => syncBarberoId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 focus:outline-none focus:border-blue-500 transition-all text-xs shadow-2xs cursor-pointer font-semibold"
                >
                  <option value="">{t.noBarber}</option>
                  {barberos.map((b) => (
                    <option key={b.id} value={b.id}>{b.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                  <span>{t.sectionPayment}</span>
                </h3>
                <button
                  type="button"
                  onClick={handleAddPayment}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t.addPayment}</span>
                </button>
              </div>

              {payments.map((p, idx) => (
                <div key={idx} className="flex gap-3 items-center bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block">{t.paymentMethod}</label>
                    <select
                      value={p.metodo_pago}
                      onChange={(e) => handlePaymentChange(idx, 'metodo_pago', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-none focus:border-blue-500 shadow-2xs font-medium cursor-pointer"
                    >
                      {availableMethods.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-32 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block text-center">{t.amount}</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={p.monto}
                      onChange={(e) => handlePaymentChange(idx, 'monto', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs text-center font-mono font-bold shadow-2xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemovePayment(idx)}
                    disabled={payments.length <= 1}
                    className="p-2 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors mt-4 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    title={lang === 'es' ? 'Quitar pago' : 'Remove payment'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-400 font-medium">{t.totalLabel}:</span>
                <span className="text-sm font-black font-mono text-slate-900">
                  {new Intl.NumberFormat(lang === 'es' ? 'es-PE' : 'en-US', {
                    style: 'currency',
                    currency: 'PEN',
                    minimumFractionDigits: 2,
                  }).format(totalCalculated)}
                </span>
                <span className="text-[10px] text-slate-400 italic">({t.calculatedFromPayments})</span>
              </div>
            </div>
          </form>
        </div>

        <div className="px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-slate-100 bg-white flex items-center justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs">
            {t.cancel}
          </button>
          <button
            type="submit"
            form="edit-sale-form"
            disabled={submitting}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{t.saving}</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{t.save}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
};
