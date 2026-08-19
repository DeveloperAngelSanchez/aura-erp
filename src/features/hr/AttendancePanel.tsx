import React, { useEffect, useState } from 'react';
import { supabase } from '../../api/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useSettings } from '../../context/SettingsContext';
import { useEmpresa } from '../../context/EmpresaContext';
import {
  Clock,
  UserCheck,
  UserX,
  Scissors,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  LogOut,
} from 'lucide-react';

interface AttendanceRecord {
  id: string;
  usuario_id: string;
  sucursal_id: string;
  fecha: string;
  entrada_en: string;
  salida_en: string | null;
}

interface CommissionRow {
  comision: number | string;
  venta_fecha?: string;
}

const translations = {
  es: {
    clockIn: 'Marcar Entrada',
    clockOut: 'Marcar Salida',
    clockedIn: 'En Servicio',
    clockedOut: 'Fuera de Servicio',
    clockedInAt: 'Entrada',
    clockedOutAt: 'Salida',
    todayCommissions: 'Comisiones de Hoy',
    noCommissions: 'Sin comisiones hoy',
    error: 'Error al registrar',
    successIn: '¡Entrada registrada!',
    successOut: '¡Salida registrada!',
    loading: 'Cargando...',
    confirmClockOut: '¿Confirmar salida? Se registrará el fin de tu jornada.',
    confirm: 'Confirmar',
    cancel: 'Cancelar',
  },
  en: {
    clockIn: 'Clock In',
    clockOut: 'Clock Out',
    clockedIn: 'On Duty',
    clockedOut: 'Off Duty',
    clockedInAt: 'Clock In',
    clockedOutAt: 'Clock Out',
    todayCommissions: "Today's Commissions",
    noCommissions: 'No commissions today',
    error: 'Error recording',
    successIn: 'Clock-in recorded!',
    successOut: 'Clock-out recorded!',
    loading: 'Loading...',
    confirmClockOut: 'Confirm clock out? Your shift will end.',
    confirm: 'Confirm',
    cancel: 'Cancel',
  },
};

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
};

export const AttendancePanel: React.FC = () => {
  const { profile } = useAuth();
  const { lang } = useLanguage();
  const { formatMoney } = useSettings();
  const { impersonating, activeBranchIds, rubroConfig } = useEmpresa();
  const t = translations[lang];

  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [commissions, setCommissions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showConfirmOut, setShowConfirmOut] = useState(false);

  const loadToday = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      const [attRes, commRes] = await Promise.all([
        supabase.from('asistencia').select('*')
          .eq('usuario_id', profile.id)
          .eq('fecha', today)
          .maybeSingle(),
        supabase.from('vista_comisiones_barberos').select('comision, venta_fecha')
          .eq('barbero_id', profile.id),
      ]);

      if (attRes.error) throw attRes.error;
      setTodayRecord(attRes.data);

      const total = (commRes.data || []).reduce((sum: number, r: CommissionRow) => {
        const cDate = r.venta_fecha ? r.venta_fecha.split('T')[0] : '';
        if (cDate === today) {
          return sum + parseFloat(r.comision?.toString() || '0');
        }
        return sum;
      }, 0);
      setCommissions(total);
    } catch (err: any) {
      console.error('Error loading attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadToday();
  }, [profile]);

  const handleClockIn = async () => {
    if (!profile) return;
    setError(null);
    setSuccess(null);
    try {
      const targetBranchId = impersonating && activeBranchIds.length > 0 ? activeBranchIds[0] : profile?.sucursal_id;
      const { error: err } = await supabase.from('asistencia').insert({
        usuario_id: profile.id,
        sucursal_id: targetBranchId,
        fecha: new Date().toISOString().split('T')[0],
        entrada_en: new Date().toISOString(),
      });
      if (err) throw err;
      setSuccess(t.successIn);
      loadToday();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || t.error);
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleClockOut = async () => {
    if (!profile || !todayRecord) return;
    setError(null);
    setSuccess(null);
    try {
      const { error: err } = await supabase.from('asistencia')
        .update({ salida_en: new Date().toISOString() })
        .eq('id', todayRecord.id);
      if (err) throw err;
      setSuccess(t.successOut);
      setShowConfirmOut(false);
      loadToday();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || t.error);
      setTimeout(() => setError(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm text-center text-slate-400 text-xs">
        <span className="w-5 h-5 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin inline-block mr-2 align-middle"></span>
        {t.loading}
      </div>
    );
  }

  const isActive = todayRecord && !todayRecord.salida_en;

  return (
    <div className="space-y-5">
      {/* Attendance Status Card */}
      <div className={`rounded-xl border p-5 shadow-sm transition-all ${
        isActive
          ? 'bg-emerald-50 border-emerald-200'
          : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isActive
                ? 'bg-emerald-100 text-emerald-600'
                : 'bg-slate-100 text-slate-400'
            }`}>
              {isActive ? <UserCheck className="w-5 h-5" /> : <UserX className="w-5 h-5" />}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">
                {isActive ? t.clockedIn : t.clockedOut}
              </p>
              {todayRecord && (
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                  {t.clockedInAt}: {formatTime(todayRecord.entrada_en)}
                  {todayRecord.salida_en && (
                    <> | {t.clockedOutAt}: {formatTime(todayRecord.salida_en)}</>
                  )}
                </p>
              )}
            </div>
          </div>

          {isActive ? (
            <button onClick={() => setShowConfirmOut(true)}
              className="px-4 py-2 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5">
              <LogOut className="w-3.5 h-3.5" />
              {t.clockOut}
            </button>
          ) : !todayRecord ? (
            <button onClick={handleClockIn}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {t.clockIn}
            </button>
          ) : null}
        </div>

        {error && (
          <div className="mt-3 bg-rose-50 border border-rose-200 text-rose-700 p-2.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            {error}
          </div>
        )}
        {success && (
          <div className="mt-3 bg-emerald-50 border border-emerald-200 text-emerald-700 p-2.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {success}
          </div>
        )}
      </div>

      {/* Today's Commissions Card */}
      {rubroConfig.features.comisionesBarbero && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5 text-purple-500" />
              {t.todayCommissions}
            </p>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-950 font-mono">
            {formatMoney(commissions)}
          </p>
          {commissions === 0 && (
            <p className="text-[10px] text-slate-400 italic mt-2">{t.noCommissions}</p>
          )}
        </div>
      )}

      {/* Confirm Clock Out Modal */}
      {showConfirmOut && (
        <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xs shadow-xl p-6 space-y-5">
            <div className="text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <LogOut className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-slate-900">{t.confirmClockOut}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirmOut(false)}
                className="flex-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all">
                {t.cancel}
              </button>
              <button onClick={handleClockOut}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm">
                {t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
