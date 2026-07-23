import React, { useEffect, useState } from 'react';
import { supabase } from '../../api/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useSettings } from '../../context/SettingsContext';
import { AlertCircle, CheckCircle2, X, Loader2 } from 'lucide-react';

interface Solicitud {
  id: string;
  tipo: 'ingreso_manual' | 'egreso_manual';
  monto: number;
  motivo: string;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
  solicitado_en: string;
  perfiles: { nombre: string } | null;
}

const translations = {
  es: {
    title: 'Aprobaciones de Caja',
    empty: 'No hay solicitudes pendientes',
    approve: 'Aprobar',
    reject: 'Rechazar',
    income: 'Ingreso',
    expense: 'Egreso',
    loading: 'Cargando...',
    approved: 'Solicitud aprobada',
    rejected: 'Solicitud rechazada',
    by: 'por',
    reason: 'Motivo',
    amount: 'Monto',
    date: 'Fecha',
    noActions: 'Sin acciones pendientes',
  },
  en: {
    title: 'Cash Approvals',
    empty: 'No pending requests',
    approve: 'Approve',
    reject: 'Reject',
    income: 'Income',
    expense: 'Expense',
    loading: 'Loading...',
    approved: 'Request approved',
    rejected: 'Request rejected',
    by: 'by',
    reason: 'Reason',
    amount: 'Amount',
    date: 'Date',
    noActions: 'No pending actions',
  }
};

export const CashApprovals: React.FC = () => {
  const { profile } = useAuth();
  const { lang } = useLanguage();
  const { formatMoney } = useSettings();
  const t = translations[lang];

  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadSolicitudes = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const { data, error } = await supabase
        .from('movimientos_caja_solicitudes')
        .select('*, perfiles:usuario_id(nombre)')
        .order('solicitado_en', { ascending: false });

      if (error) throw error;
      setSolicitudes(data || []);
    } catch (err: any) {
      console.error('Error loading cash requests:', err);
      setErrorMsg(err.message || 'Error al cargar solicitudes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSolicitudes();
  }, []);

  const handleApprove = async (id: string) => {
    if (!profile?.id) return;
    setProcessing(id);
    try {
      const { error } = await supabase.rpc('aprobar_movimiento_caja', {
        p_solicitud_id: id,
        p_aprobador_id: profile.id,
        p_estado: 'aprobado',
        p_comentario: null,
      });
      if (error) throw error;
      setSuccessMessage(t.approved);
      loadSolicitudes();
    } catch (err: any) {
      console.error('Error approving request:', err);
      alert(err.message || 'Error approving request');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!profile?.id) return;
    setProcessing(id);
    try {
      const { error } = await supabase.rpc('aprobar_movimiento_caja', {
        p_solicitud_id: id,
        p_aprobador_id: profile.id,
        p_estado: 'rechazado',
        p_comentario: null,
      });
      if (error) throw error;
      setSuccessMessage(t.rejected);
      loadSolicitudes();
    } catch (err: any) {
      console.error('Error rejecting request:', err);
      alert(err.message || 'Error rejecting request');
    } finally {
      setProcessing(null);
    }
  };

  const pending = solicitudes.filter(s => s.estado === 'pendiente');
  const history = solicitudes.filter(s => s.estado !== 'pendiente');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-slate-900">{t.title}</h1>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-sm flex items-center gap-2.5 shadow-sm">
          <AlertCircle className="w-4.5 h-4.5 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-sm flex items-center gap-2.5 shadow-sm">
          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">{t.loading}</span>
        </div>
      ) : pending.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-2xs">
          <p className="text-sm text-slate-500 font-medium">{t.empty}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((sol) => (
            <div key={sol.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${sol.tipo === 'ingreso_manual' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                    sol.tipo === 'ingreso_manual'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-rose-50 text-rose-700'
                  }`}>
                    {sol.tipo === 'ingreso_manual' ? t.income : t.expense}
                  </span>
                  <span className="font-bold font-mono text-sm">{formatMoney(sol.monto)}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">
                  {new Date(sol.solicitado_en).toLocaleString(lang === 'es' ? 'es-PE' : 'en-US')}
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium">{sol.motivo}</p>
              {sol.perfiles && (
                <p className="text-[10px] text-slate-400 font-semibold">{t.by} {sol.perfiles.nombre}</p>
              )}
              <div className="flex gap-2 pt-1">
                <button onClick={() => handleApprove(sol.id)} disabled={processing === sol.id}
                  className="flex-1 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {t.approve}
                </button>
                <button onClick={() => handleReject(sol.id)} disabled={processing === sol.id}
                  className="flex-1 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50">
                  <X className="w-3.5 h-3.5" />
                  {t.reject}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {lang === 'es' ? 'Historial' : 'History'}
          </h2>
          {history.map((sol) => (
            <div key={sol.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className={`w-2 h-2 rounded-full ${
                  sol.estado === 'aprobado' ? 'bg-emerald-500' : 'bg-slate-400'
                }`} />
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  sol.tipo === 'ingreso_manual'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-rose-50 text-rose-700'
                }`}>
                  {sol.tipo === 'ingreso_manual' ? t.income : t.expense}
                </span>
                <span className="font-bold font-mono text-xs">{formatMoney(sol.monto)}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  sol.estado === 'aprobado'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {sol.estado === 'aprobado' ? t.approved : t.rejected}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                {new Date(sol.solicitado_en).toLocaleString(lang === 'es' ? 'es-PE' : 'en-US')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
