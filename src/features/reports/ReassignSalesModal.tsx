import React, { useState, useEffect } from 'react';
import { supabase } from '../../api/supabaseClient';
import { useSettings } from '../../context/SettingsContext';
import { useEmpresa } from '../../context/EmpresaContext';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  CheckSquare,
  Square,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
} from 'lucide-react';

interface TurnOption {
  id: string;
  sucursal_nombre: string;
  usuario_nombre: string;
  abierto_en: string;
  cerrado_en: string | null;
  total_ventas: number;
}

interface SaleCandidate {
  id: string;
  correlativo: number | null;
  total: number;
  metodo_pago: string;
  creado_en: string;
  cliente_nombre: string | null;
  barbero_nombre: string | null;
  turno_id: string | null;
  sucursal_nombre?: string;
  sucursal_id?: string;
}

interface ReassignSalesModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedTurnId?: string | null;
  onSuccess: () => void;
}

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const ReassignSalesModal: React.FC<ReassignSalesModalProps> = ({
  isOpen,
  onClose,
  preselectedTurnId,
  onSuccess,
}) => {
  const { formatMoney } = useSettings();
  const { profile } = useAuth();
  const { impersonating, activeBranchIds } = useEmpresa();

  const [turns, setTurns] = useState<TurnOption[]>([]);
  const [selectedTurnId, setSelectedTurnId] = useState<string>('');

  const [salesScope, setSalesScope] = useState<'sin_turno' | 'todas'>('sin_turno');
  const [dateFrom, setDateFrom] = useState(() => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [salesCandidates, setSalesCandidates] = useState<SaleCandidate[]>([]);
  const [selectedSaleIds, setSelectedSaleIds] = useState<Set<string>>(new Set());

  const [loadingTurns, setLoadingTurns] = useState(false);
  const [loadingSales, setLoadingSales] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    setSuccessMsg(null);
    setSelectedSaleIds(new Set());

    loadTurns();
  }, [isOpen]);

  useEffect(() => {
    if (preselectedTurnId) {
      setSelectedTurnId(preselectedTurnId);
    }
  }, [preselectedTurnId]);

  useEffect(() => {
    if (isOpen) {
      loadSales();
    }
  }, [isOpen, salesScope, dateFrom, dateTo]);

  const loadTurns = async () => {
    setLoadingTurns(true);
    try {
      const branchFilter = impersonating ? activeBranchIds : [profile?.sucursal_id];
      const { data, error: err } = await supabase
        .from('vista_reporte_cierres_turno')
        .select('id, sucursal_nombre, usuario_nombre, abierto_en, cerrado_en, total_ventas')
        .in('sucursal_id', branchFilter)
        .order('abierto_en', { ascending: false })
        .limit(50);

      if (err) throw err;
      setTurns(data || []);

      if (preselectedTurnId) {
        setSelectedTurnId(preselectedTurnId);
      } else if (data && data.length > 0) {
        setSelectedTurnId(data[0].id);
      }
    } catch (err: any) {
      console.error('Error loading shifts for reassignment:', err);
    } finally {
      setLoadingTurns(false);
    }
  };

  const loadSales = async () => {
    setLoadingSales(true);
    setError(null);
    try {
      const branchFilter = impersonating ? activeBranchIds : [profile?.sucursal_id];
      let query = supabase
        .from('ventas')
        .select('id, correlativo, total, metodo_pago, creado_en, cliente_nombre, turno_id, sucursal_id, barbero:perfiles!ventas_barbero_id_fkey(nombre), sucursal:sucursales!ventas_sucursal_id_fkey(nombre)')
        .in('sucursal_id', branchFilter)
        .eq('estado', 'completada')
        .gte('creado_en', `${dateFrom}T00:00:00Z`)
        .lte('creado_en', `${dateTo}T23:59:59Z`)
        .order('creado_en', { ascending: false });

      if (salesScope === 'sin_turno') {
        query = query.is('turno_id', null);
      }

      const { data, error: err } = await query;
      if (err) throw err;

      const formatted = (data || []).map((s: any) => ({
        id: s.id,
        correlativo: s.correlativo,
        total: s.total,
        metodo_pago: s.metodo_pago,
        creado_en: s.creado_en,
        cliente_nombre: s.cliente_nombre,
        barbero_nombre: s.barbero?.nombre || null,
        turno_id: s.turno_id,
        sucursal_nombre: s.sucursal?.nombre || 'Sucursal Principal',
        sucursal_id: s.sucursal_id,
      }));

      setSalesCandidates(formatted);
    } catch (err: any) {
      console.error('Error loading sales candidates:', err);
      setError('Error al cargar la lista de ventas.');
    } finally {
      setLoadingSales(false);
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedSaleIds.size === salesCandidates.length) {
      setSelectedSaleIds(new Set());
    } else {
      setSelectedSaleIds(new Set(salesCandidates.map((s) => s.id)));
    }
  };

  const handleToggleSale = (id: string) => {
    const next = new Set(selectedSaleIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedSaleIds(next);
  };

  const selectedCount = selectedSaleIds.size;
  const selectedSum = salesCandidates
    .filter((s) => selectedSaleIds.has(s.id))
    .reduce((sum, s) => sum + (s.total || 0), 0);

  const handleExecuteReassignment = async () => {
    if (!selectedTurnId) {
      setError('Seleccione el turno de destino');
      return;
    }
    if (selectedSaleIds.size === 0) {
      setError('Seleccione al menos una venta para anexar');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      // Call atomic RPC function in PostgreSQL
      const { error: rpcErr } = await supabase.rpc('reasignar_ventas_a_turno_atomico', {
        p_turno_destino_id: selectedTurnId,
        p_venta_ids: Array.from(selectedSaleIds),
        p_usuario_id: profile?.id || null,
      });

      if (rpcErr) throw rpcErr;

      setSuccessMsg(`¡Se anexaron ${selectedCount} ventas correctamente al turno!`);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Error reassigning sales:', err);
      setError(err.message || 'Error al vincular ventas al turno.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Anexar / Reasignar Ventas a Turno</h3>
              <p className="text-xs text-slate-500">Gestión contable de ventas sin turno o reasignación entre cierres</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Container */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-white">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Turn Destination Selector */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-600" />
              Turno de Destino para Anexar Ventas
            </label>
            {loadingTurns ? (
              <div className="py-2 text-xs text-slate-500 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span>Cargando turnos disponibles...</span>
              </div>
            ) : (
              <select
                value={selectedTurnId}
                onChange={(e) => setSelectedTurnId(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:border-blue-600 shadow-sm"
              >
                {turns.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.sucursal_nombre} | Cajero: {t.usuario_nombre} | Cierre: {t.cerrado_en ? formatDate(t.cerrado_en) : 'En Curso (Abierto)'} | Total Ventas: {formatMoney(t.total_ventas)}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Filtrar Ventas por</label>
              <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setSalesScope('sin_turno')}
                  className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-md transition-all ${
                    salesScope === 'sin_turno'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sin Turno
                </button>
                <button
                  type="button"
                  onClick={() => setSalesScope('todas')}
                  className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-md transition-all ${
                    salesScope === 'todas'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Todas las Ventas
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fecha Desde</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fecha Hasta</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          {/* Sales Table Candidates */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="text-slate-600 hover:text-blue-600 flex items-center gap-1.5 text-xs font-semibold"
                >
                  {selectedSaleIds.size > 0 && selectedSaleIds.size === salesCandidates.length ? (
                    <CheckSquare className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                  <span>Seleccionar Todas ({salesCandidates.length})</span>
                </button>
              </div>

              {selectedCount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-200">
                    {selectedCount} seleccionadas ({formatMoney(selectedSum)})
                  </span>
                </div>
              )}
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
              {loadingSales ? (
                <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Buscando ventas disponibles...</span>
                </div>
              ) : salesCandidates.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No se encontraron ventas para los criterios seleccionados.
                </div>
              ) : (
                salesCandidates.map((sale) => {
                  const isChecked = selectedSaleIds.has(sale.id);
                  return (
                    <div
                      key={sale.id}
                      onClick={() => handleToggleSale(sale.id)}
                      className={`px-4 py-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                        isChecked ? 'bg-blue-50/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSale(sale.id);
                          }}
                          className="text-slate-400 hover:text-blue-600"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-slate-800">
                              Ticket #{sale.correlativo || sale.id.slice(0, 8)}
                            </span>
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-semibold rounded uppercase">
                              {sale.metodo_pago}
                            </span>
                            {sale.turno_id ? (
                              <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-medium rounded">
                                Con Turno
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-medium rounded">
                                Sin Turno
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {formatDate(sale.creado_en)} | Cliente: {sale.cliente_nombre || 'General'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-bold text-xs text-slate-900">{formatMoney(sale.total)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {selectedCount > 0 ? (
              <span>Se asociará(n) <strong>{selectedCount}</strong> venta(s) al turno seleccionado.</span>
            ) : (
              <span>Seleccione las ventas que desea anexar al turno.</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleExecuteReassignment}
              disabled={saving || selectedCount === 0 || !selectedTurnId}
              className="px-5 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Anexar {selectedCount} Venta(s)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
