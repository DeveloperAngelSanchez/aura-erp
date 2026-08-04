import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../api/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useCash } from '../../context/CashContext';
import { useLanguage } from '../../context/LanguageContext';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

interface Props {
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const CashMovementModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  const { lang } = useLanguage();
  const { profile } = useAuth();
  const { activeTurn } = useCash();
  const [tipo, setTipo] = useState<'ingreso_manual' | 'egreso_manual'>('ingreso_manual');
  const [monto, setMonto] = useState('');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTurn) return;
    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      setError(lang === 'es' ? 'Ingresa un monto válido mayor a 0' : 'Enter a valid amount greater than 0');
      return;
    }
    if (!motivo.trim()) {
      setError(lang === 'es' ? 'Describe el motivo del movimiento' : 'Describe the reason for the movement');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Check if user has permission to register movement directly
      const { data: permData } = await supabase
        .from('permisos_usuario')
        .select('habilitado')
        .eq('usuario_id', profile?.id)
        .eq('permiso', 'registrar_movimiento_caja')
        .maybeSingle();

      const esAdminOConPermiso = profile?.rol === 'admin' || profile?.rol_sistema === 'sistema_admin' || permData?.habilitado === true;

      const { error: rpcError } = await supabase.rpc('crear_solicitud_movimiento_caja', {
        p_turno_id: activeTurn.id,
        p_usuario_id: profile?.id,
        p_tipo: tipo,
        p_monto: montoNum,
        p_motivo: motivo.trim(),
        p_nota: null,
      });

      if (rpcError) throw rpcError;

      if (esAdminOConPermiso) {
        onSuccess(lang === 'es'
          ? `Movimiento de ${tipo === 'ingreso_manual' ? 'ingreso' : 'egreso'} registrado exitosamente`
          : `${tipo === 'ingreso_manual' ? 'Income' : 'Expense'} movement recorded successfully`
        );
      } else {
        onSuccess(lang === 'es'
          ? `Solicitud de ${tipo === 'ingreso_manual' ? 'ingreso' : 'egreso'} enviada para aprobación`
          : `${tipo === 'ingreso_manual' ? 'Income' : 'Expense'} request sent for approval`
        );
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al crear movimiento');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[80] bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm shadow-xl p-6 space-y-6 text-slate-800 animate-in fade-in zoom-in duration-205"
      >
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-950 flex items-center gap-2">
            <CheckCircle2 className="w-4.5 h-4.5 text-blue-600" />
            <span>{lang === 'es' ? 'Movimiento de Caja' : 'Cash Movement'}</span>
          </h2>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {lang === 'es' ? 'Tipo de movimiento' : 'Movement type'}
            </label>
            <div className="flex gap-2">
              <button type="button"
                onClick={() => setTipo('ingreso_manual')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  tipo === 'ingreso_manual'
                    ? 'bg-emerald-50 border border-emerald-300 text-emerald-700 shadow-sm'
                    : 'bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100'
                }`}>
                {lang === 'es' ? 'Ingreso' : 'Income'}
              </button>
              <button type="button"
                onClick={() => setTipo('egreso_manual')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  tipo === 'egreso_manual'
                    ? 'bg-rose-50 border border-rose-300 text-rose-700 shadow-sm'
                    : 'bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100'
                }`}>
                {lang === 'es' ? 'Egreso' : 'Expense'}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {lang === 'es' ? 'Monto' : 'Amount'}
            </label>
            <input type="number" step="0.01" min="0.01" required placeholder="0.00"
              value={monto} onChange={(e) => setMonto(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 transition-all text-xs font-mono font-bold shadow-sm" />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {lang === 'es' ? 'Motivo' : 'Reason'}
            </label>
            <textarea required rows={2} placeholder={lang === 'es' ? 'Describe el motivo...' : 'Describe the reason...'}
              value={motivo} onChange={(e) => setMotivo(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 transition-all text-xs shadow-sm resize-none" />
          </div>

          <button type="submit" disabled={submitting}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-blue-500/10 flex items-center justify-center gap-2 cursor-pointer">
            {submitting ? (
              <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <span>{lang === 'es' ? 'Enviar Solicitud' : 'Send Request'}</span>
            )}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
};
