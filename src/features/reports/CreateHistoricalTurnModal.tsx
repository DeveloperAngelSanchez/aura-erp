import React, { useState, useEffect } from 'react';
import { supabase } from '../../api/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useEmpresa } from '../../context/EmpresaContext';
import { X, Clock, Calendar, User, Building2, DollarSign, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface Sucursal {
  id: string;
  nombre: string;
}

interface Usuario {
  id: string;
  nombre: string;
  rol: string;
}

interface CreateHistoricalTurnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newTurnId: string) => void;
}

export const CreateHistoricalTurnModal: React.FC<CreateHistoricalTurnModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { profile } = useAuth();
  const { impersonating, activeBranchIds } = useEmpresa();

  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [cajeros, setCajeros] = useState<Usuario[]>([]);

  const [sucursalId, setSucursalId] = useState('');
  const [usuarioId, setUsuarioId] = useState('');
  const [montoApertura, setMontoApertura] = useState<number>(0);
  const [montoCierreReal, setMontoCierreReal] = useState<number>(0);
  const [fechaApertura, setFechaApertura] = useState('');
  const [fechaCierre, setFechaCierre] = useState('');
  const [notas, setNotas] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Set initial dates (default: today)
    const now = new Date();
    const isoNow = now.toISOString().slice(0, 16);
    setFechaApertura(isoNow);
    setFechaCierre(isoNow);
    setMontoApertura(0);
    setMontoCierreReal(0);
    setNotas('');
    setError(null);

    loadInitialData();
  }, [isOpen]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // 1. Load branches
      const branchIds = impersonating && activeBranchIds.length > 0 ? activeBranchIds : (profile?.sucursal_id ? [profile.sucursal_id] : []);
      let branchQuery = supabase.from('sucursales').select('id, nombre').order('nombre');
      if (branchIds.length > 0) {
        branchQuery = branchQuery.in('id', branchIds);
      }
      const { data: bData, error: bErr } = await branchQuery;
      if (bErr) throw bErr;

      setSucursales(bData || []);
      if (bData && bData.length > 0) {
        setSucursalId(bData[0].id);
      }

      // 2. Load staff/cashiers
      const { data: uData, error: uErr } = await supabase
        .from('perfiles')
        .select('id, nombre, rol')
        .order('nombre');
      if (uErr) throw uErr;

      setCajeros(uData || []);
      if (profile?.id) {
        setUsuarioId(profile.id);
      } else if (uData && uData.length > 0) {
        setUsuarioId(uData[0].id);
      }
    } catch (err: any) {
      console.error('Error loading data for historical turn:', err);
      setError(err.message || 'Error al cargar sucursales y usuarios');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sucursalId) {
      setError('Seleccione una sucursal');
      return;
    }
    if (!usuarioId) {
      setError('Seleccione un cajero responsable');
      return;
    }
    if (!fechaApertura || !fechaCierre) {
      setError('Ingrese la fecha y hora de apertura y cierre');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const openIso = new Date(fechaApertura).toISOString();
      const closeIso = new Date(fechaCierre).toISOString();

      // Insert closed historical turn
      const { data, error: insertErr } = await supabase
        .from('caja_turnos')
        .insert({
          sucursal_id: sucursalId,
          usuario_id: usuarioId,
          monto_apertura: Number(montoApertura) || 0,
          monto_cierre_real: Number(montoCierreReal) || 0,
          monto_cierre_esperado: Number(montoApertura) || 0,
          diferencia_caja: (Number(montoCierreReal) || 0) - (Number(montoApertura) || 0),
          estado: 'cerrado',
          abierto_en: openIso,
          cerrado_en: closeIso,
        })
        .select('id')
        .single();

      if (insertErr) throw insertErr;

      onSuccess(data.id);
      onClose();
    } catch (err: any) {
      console.error('Error creating historical turn:', err);
      setError(err.message || 'Ocurrió un error al crear el turno histórico.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Crear Turno Histórico / Manual</h3>
              <p className="text-xs text-slate-500">Apertura y cierre retroactivo de caja</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-8 flex items-center justify-center text-slate-500 text-sm gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span>Cargando configuración...</span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Sucursal */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    Sucursal
                  </label>
                  <select
                    value={sucursalId}
                    onChange={(e) => setSucursalId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 text-slate-800"
                    required
                  >
                    {sucursales.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Cajero Responsable */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    Cajero Responsable
                  </label>
                  <select
                    value={usuarioId}
                    onChange={(e) => setUsuarioId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 text-slate-800"
                    required
                  >
                    {cajeros.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nombre} ({u.rol})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Fecha/Hora Apertura
                  </label>
                  <input
                    type="datetime-local"
                    value={fechaApertura}
                    onChange={(e) => setFechaApertura(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Fecha/Hora Cierre
                  </label>
                  <input
                    type="datetime-local"
                    value={fechaCierre}
                    onChange={(e) => setFechaCierre(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 text-slate-800"
                    required
                  />
                </div>
              </div>

              {/* Montos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                    Monto Apertura
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={montoApertura}
                    onChange={(e) => setMontoApertura(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                    Monto Conteo Real
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={montoCierreReal}
                    onChange={(e) => setMontoCierreReal(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 text-slate-800"
                  />
                </div>
              </div>

              {/* Notas de Auditoría */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  Notas de Auditoría (Opcional)
                </label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={2}
                  placeholder="Motivo de la creación de este turno histórico..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 text-slate-800 resize-none"
                />
              </div>
            </>
          )}

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || loading}
              className="px-5 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Crear Turno Histórico</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
