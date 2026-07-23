import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../api/supabaseClient';
import { useLanguage } from '../../context/LanguageContext';
import { AlertCircle, X, ShieldAlert } from 'lucide-react';

interface Props {
  saleId: string;
  saleTotal: number;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const AnulationModal: React.FC<Props> = ({ saleId, saleTotal, onClose, onSuccess }) => {
  const { lang } = useLanguage();
  const [motivo, setMotivo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivo.trim()) {
      setError(lang === 'es' ? 'Debes indicar el motivo de la anulación' : 'You must state the reason for the anulation');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { error: rpcError } = await supabase.rpc('anular_venta_pos', {
        p_venta_id: saleId,
        p_motivo: motivo.trim()
      });

      if (rpcError) throw rpcError;

      onSuccess(lang === 'es' ? `Venta #${saleId.slice(0, 8)} anulada correctamente` : `Sale #${saleId.slice(0, 8)} annulled successfully`);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al anular venta');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm shadow-xl p-6 space-y-6 text-slate-800 animate-in fade-in zoom-in duration-205">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-950 flex items-center gap-2">
              <ShieldAlert className="w-4.5 h-4.5 text-rose-600" />
              <span>{lang === 'es' ? 'Anular Venta' : 'Annul Sale'}</span>
            </h2>
            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
              #{saleId.slice(0, 8)} {saleTotal > 0 ? `— S/ ${saleTotal.toFixed(2)}` : ''}
            </p>
          </div>
          <button onClick={onClose}
            className="text-slate-400 hover:text-slate-600 focus:outline-none">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs flex items-center gap-1.5 shadow-sm">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-xs leading-relaxed shadow-sm">
          <p className="font-bold mb-1">
            {lang === 'es' ? '⚠️ Esta acción revertirá la venta' : '⚠️ This action will reverse the sale'}
          </p>
          <p>
            {lang === 'es'
              ? 'Se devolverá el inventario, se anularán los pagos y se revertirán los movimientos de caja. Esta operación no se puede deshacer.'
              : 'Inventory will be returned, payments annulled, and cash movements reversed. This cannot be undone.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {lang === 'es' ? 'Motivo de anulación' : 'Reason for anulation'}
            </label>
            <textarea required rows={3}
              placeholder={lang === 'es' ? 'Describe el motivo...' : 'Describe the reason...'}
              value={motivo} onChange={(e) => setMotivo(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 transition-all text-xs shadow-sm resize-none" />
          </div>

          <button type="submit" disabled={submitting}
            className="w-full py-3 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-rose-500/10 flex items-center justify-center gap-2 cursor-pointer">
            {submitting ? (
              <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <span>{lang === 'es' ? 'Confirmar Anulación' : 'Confirm Annulment'}</span>
            )}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
};
