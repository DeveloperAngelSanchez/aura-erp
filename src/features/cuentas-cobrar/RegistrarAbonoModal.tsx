import React, { useState } from 'react';
import { X, DollarSign, Wallet, CreditCard, Building, Smartphone, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { type CreditoVenta, registrarAbono } from './cuentasCobrarService';

interface RegistrarAbonoModalProps {
  venta: CreditoVenta;
  currentTurnId?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const RegistrarAbonoModal: React.FC<RegistrarAbonoModalProps> = ({
  venta,
  currentTurnId,
  onClose,
  onSuccess,
}) => {
  const { profile } = useAuth();
  const { lang } = useLanguage();
  const moneda = venta.moneda || 'S/.';

  const [monto, setMonto] = useState<string>('');
  const [metodoPago, setMetodoPago] = useState<string>('efectivo');
  const [notas, setNotas] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const saldo = venta.saldo_pendiente;

  const paymentMethods = [
    { id: 'efectivo', label: lang === 'es' ? 'Efectivo' : 'Cash', icon: Wallet },
    { id: 'yape_plin', label: 'Yape / Plin', icon: Smartphone },
    { id: 'tarjeta', label: lang === 'es' ? 'Tarjeta' : 'Card', icon: CreditCard },
    { id: 'transferencia', label: lang === 'es' ? 'Transferencia' : 'Transfer', icon: Building },
  ];

  const handleSetPercent = (pct: number) => {
    const val = Math.round((saldo * pct) * 100) / 100;
    setMonto(val.toString());
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const numericMonto = parseFloat(monto);
    if (isNaN(numericMonto) || numericMonto <= 0) {
      setError(lang === 'es' ? 'Ingresa un monto válido mayor a 0' : 'Enter a valid amount greater than 0');
      return;
    }

    if (numericMonto > saldo) {
      setError(lang === 'es' 
        ? `El monto no puede superar el saldo pendiente (${moneda} ${saldo.toFixed(2)})` 
        : `Amount cannot exceed remaining balance (${moneda} ${saldo.toFixed(2)})`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await registrarAbono({
        ventaId: venta.id,
        sucursalId: venta.sucursal_id,
        usuarioId: profile.id,
        turnoId: currentTurnId || null,
        monto: numericMonto,
        metodoPago,
        notas: notas.trim() || null,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || (lang === 'es' ? 'Error al procesar el abono' : 'Error processing payment'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <DollarSign className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {lang === 'es' ? 'Registrar Abono / Cobro' : 'Register Payment'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {lang === 'es' ? 'Ticket' : 'Ticket'} #{venta.correlativo ? String(venta.correlativo).padStart(8, '0') : venta.id.slice(-8).toUpperCase()} • {venta.cliente_nombre || 'Cliente'}
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

        {/* Resumen del Saldo */}
        <div className="p-5 bg-blue-50/50 border-b border-blue-100/60 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              {lang === 'es' ? 'Saldo Pendiente' : 'Remaining Balance'}
            </span>
            <div className="text-2xl font-extrabold text-blue-700 tracking-tight">
              {moneda} {saldo.toFixed(2)}
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              {lang === 'es' ? 'Total Venta' : 'Total Sale'}
            </span>
            <div className="text-sm font-bold text-slate-700">
              {moneda} {venta.total.toFixed(2)}
            </div>
            <span className="text-[10px] font-semibold text-emerald-600">
              {lang === 'es' ? 'Abonado:' : 'Paid:'} {moneda} {venta.monto_pagado.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Input Monto */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {lang === 'es' ? 'Monto a Abonar' : 'Amount to Pay'} ({moneda})
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={saldo}
                value={monto}
                onChange={(e) => {
                  setMonto(e.target.value);
                  setError(null);
                }}
                placeholder="0.00"
                autoFocus
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-blue-500 text-sm font-bold text-slate-900 shadow-2xs"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                {moneda}
              </span>
            </div>

            {/* Quick buttons */}
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => handleSetPercent(0.25)}
                className="flex-1 py-1 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                25%
              </button>
              <button
                type="button"
                onClick={() => handleSetPercent(0.5)}
                className="flex-1 py-1 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                50%
              </button>
              <button
                type="button"
                onClick={() => handleSetPercent(1)}
                className="flex-1 py-1 text-[11px] font-bold rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-800 transition-colors cursor-pointer"
              >
                {lang === 'es' ? 'Total (100%)' : 'Full (100%)'}
              </button>
            </div>
          </div>

          {/* Método de Pago */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {lang === 'es' ? 'Método de Pago' : 'Payment Method'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {paymentMethods.map((m) => {
                const Icon = m.icon;
                const isSelected = metodoPago === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMetodoPago(m.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className="truncate">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notificación de Turno de Caja */}
          {currentTurnId ? (
            <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2 text-emerald-800 text-[11px] font-medium">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                {lang === 'es' 
                  ? 'Tienes un turno de caja abierto: el cobro se anexará a tu arqueo de hoy.' 
                  : 'You have an open shift: payment will link to today cash drawer.'}
              </span>
            </div>
          ) : (
            <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-2 text-amber-800 text-[11px] font-medium">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>
                {lang === 'es' 
                  ? 'Sin turno de caja abierto: el abono se registrará en el expediente pero no en arqueo físico.' 
                  : 'No open shift: payment records to ledger without cash drawer movement.'}
              </span>
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {lang === 'es' ? 'Notas / Observaciones (Opcional)' : 'Notes (Optional)'}
            </label>
            <input
              type="text"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder={lang === 'es' ? 'Ej. Pagó en efectivo segunda cuota...' : 'e.g., Cash installment...'}
              className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-blue-500 text-xs text-slate-800"
            />
          </div>

          {/* Botones */}
          <div className="pt-2 flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              {lang === 'es' ? 'Cancelar' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{lang === 'es' ? 'Confirmar Abono' : 'Confirm Payment'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
