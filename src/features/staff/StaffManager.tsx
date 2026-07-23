import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../api/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useEmpresa } from '../../context/EmpresaContext';
import { useSettings } from '../../context/SettingsContext';
import {
  Users,
  UserPlus,
  Shield,
  Key,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Pencil,
  Search,
  Scissors,
  Clock,
  UserCheck,
  DollarSign,
  Ban,
} from 'lucide-react';

type Tab = 'personal' | 'asistencia' | 'comisiones';

interface StaffProfile {
  id: string;
  nombre: string;
  email: string;
  rol: 'admin' | 'cajero' | 'barbero';
  sucursal_id: string;
  comision_porcentaje: number | null;
  activo: boolean;
  creado_en: string;
  sucursal_nombre: string;
}

interface BarberSummary {
  id: string;
  nombre: string;
  comision_porcentaje: number;
  asistencia_hoy: string | null;
  comisiones_hoy: number;
  comisiones_semana: number;
  comisiones_mes: number;
}

interface AttendanceDetail {
  id: string;
  usuario_id: string;
  fecha: string;
  entrada_en: string;
  salida_en: string | null;
  perfiles: { nombre: string };
}

const PERMISOS_FIJOS = [
  'ver_reportes', 'gestionar_inventario', 'gestionar_compras', 'gestionar_catalogos',
  'gestionar_usuarios', 'gestionar_horarios', 'anular_venta', 'ver_historial_ventas',
  'ver_notificaciones_stock', 'registrar_movimiento_caja', 'aprobar_movimiento_caja',
  'configurar_sistema', 'ver_auditoria', 'gestionar_clientes', 'gestionar_promociones',
];

const translations: Record<string, Record<string, string>> = {
  es: {
    personal: 'Personal', asistencia: 'Asistencia', comisiones: 'Comisiones',
    title: 'Gestión de Personal', newStaff: 'Nuevo Personal', editStaff: 'Editar Personal',
    name: 'Nombre', email: 'Correo', role: 'Rol', branch: 'Sucursal',
    commission: 'Comisión', created: 'Creado', actions: 'Acciones', status: 'Estado',
    active: 'Activo', inactive: 'Inactivo', search: 'Buscar...', filterRole: 'Todos los roles',
    save: 'Guardar', cancel: 'Cancelar', delete: 'Desactivar', reactivate: 'Reactivar',
    resetPwd: 'Password', permissions: 'Permisos', codeCopied: 'Código copiado',
    codeGenerated: 'Código de reseteo generado', saved: 'Guardado correctamente',
    deleted: 'Personal desactivado', staffDeleted: 'Personal desactivado correctamente',
    confirmDelete: '¿Desactivar este miembro del personal?', nameRequired: 'El nombre es obligatorio',
    loading: 'Cargando...', noStaff: 'No hay personal registrado.',
    areActive: 'activos', total: 'Total',
    barbers: 'Barberos', attendance: 'Asistencia del Día', today: 'Hoy', week: 'Semana', month: 'Mes',
    clockIn: 'Entrada', clockOut: 'Salida', notClockedIn: 'Sin marcar', onDuty: 'En servicio',
    shiftEnded: 'Jornada terminada', noAttendance: 'Sin registros hoy',
    totalCommissions: 'Comisiones Totales', saving: 'Guardando...', showInactive: 'Ver inactivos',
    filterBarber: 'Buscar barbero...',
  },
  en: {
    personal: 'Staff', asistencia: 'Attendance', comisiones: 'Commissions',
    title: 'Staff Management', newStaff: 'New Staff', editStaff: 'Edit Staff',
    name: 'Name', email: 'Email', role: 'Role', branch: 'Branch',
    commission: 'Commission', created: 'Created', actions: 'Actions', status: 'Status',
    active: 'Active', inactive: 'Inactive', search: 'Search...', filterRole: 'All roles',
    save: 'Save', cancel: 'Cancel', delete: 'Deactivate', reactivate: 'Reactivate',
    resetPwd: 'Reset Password', permissions: 'Permissions', codeCopied: 'Code copied',
    codeGenerated: 'Reset code generated', saved: 'Saved successfully',
    deleted: 'Staff deactivated', staffDeleted: 'Staff deactivated successfully',
    confirmDelete: 'Deactivate this staff member?', nameRequired: 'Name is required',
    loading: 'Loading...', noStaff: 'No staff registered.',
    areActive: 'active', total: 'Total',
    barbers: 'Barbers', attendance: "Today's Attendance", today: 'Today', week: 'Week', month: 'Month',
    clockIn: 'Clock In', clockOut: 'Clock Out', notClockedIn: 'Not clocked in', onDuty: 'On duty',
    shiftEnded: 'Shift ended', noAttendance: 'No records today',
    totalCommissions: 'Total Commissions', saving: 'Saving...', showInactive: 'Show inactive',
    filterBarber: 'Search barber...',
  },
};

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
};

const roleBadge: Record<string, string> = {
  admin: 'bg-blue-50 text-blue-700 border-blue-200',
  cajero: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  barbero: 'bg-purple-50 text-purple-700 border-purple-200',
};

export const StaffManager: React.FC = () => {
  const { profile: myProfile } = useAuth();
  const { lang } = useLanguage();
  const { impersonating, activeBranchIds } = useEmpresa();
  const { formatMoney } = useSettings();
  const t = (key: string) => translations[lang][key] || key;

  const [tab, setTab] = useState<Tab>('personal');

  // ── Personal State ──
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showInactive, setShowInactive] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [fNombre, setFNombre] = useState('');
  const [fEmail, setFEmail] = useState('');
  const [fPassword, setFPassword] = useState('');
  const [fRol, setFRol] = useState<string>('cajero');
  const [fSucursalId, setFSucursalId] = useState('');
  const [fComision, setFComision] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [sucursales, setSucursales] = useState<{ id: string; nombre: string }[]>([]);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Permission editor state
  const [permTarget, setPermTarget] = useState<StaffProfile | null>(null);
  const [permValues, setPermValues] = useState<Record<string, boolean>>({});

  // Password reset state
  const [resetTarget, setResetTarget] = useState<StaffProfile | null>(null);
  const [resetCode, setResetCode] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  // Delete/Deactivate state
  const [deleteTarget, setDeleteTarget] = useState<StaffProfile | null>(null);

  // ── Asistencia/Comisiones State ──
  const [barbers, setBarbers] = useState<BarberSummary[]>([]);
  const [attendanceToday, setAttendanceToday] = useState<AttendanceDetail[]>([]);
  const [loadingHR, setLoadingHR] = useState(false);
  const [searchHR, setSearchHR] = useState('');

  // ── Load Staff (Tab Personal) ──
  const loadStaff = async () => {
    setLoadingStaff(true);
    try {
      const branchIds = impersonating ? activeBranchIds : [myProfile?.sucursal_id];
      const { data: sucursalData } = await supabase.from('sucursales').select('id, nombre').in('id', branchIds);
      const sucursalMap: Record<string, string> = {};
      (sucursalData || []).forEach((s: any) => { sucursalMap[s.id] = s.nombre; });

      const { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .in('sucursal_id', branchIds)
        .or('rol_sistema.neq.sistema_admin,rol_sistema.is.null')
        .order('nombre', { ascending: true });

      if (error) throw error;
      if (!data?.length) console.warn('loadStaff returned empty — branchIds:', branchIds);
      setStaff((data || []).map((r: any) => ({
        id: r.id, nombre: r.nombre, email: r.email || '', rol: r.rol,
        sucursal_id: r.sucursal_id, comision_porcentaje: r.comision_porcentaje,
        activo: r.activo !== false, creado_en: r.creado_en,
        sucursal_nombre: sucursalMap[r.sucursal_id] || '',
      })));
    } catch (err) {
      console.error('Error loading staff:', err);
    } finally {
      setLoadingStaff(false);
    }
  };

  const loadSucursales = async () => {
    const branchIds = impersonating ? activeBranchIds : [myProfile?.sucursal_id];
    const { data } = await supabase.from('sucursales').select('id, nombre').in('id', branchIds);
    setSucursales(data || []);
  };

  useEffect(() => { if (tab === 'personal') loadStaff(); }, [tab, myProfile?.sucursal_id, impersonating, activeBranchIds]);
  useEffect(() => { loadSucursales(); }, [myProfile?.sucursal_id, impersonating, activeBranchIds]);

  // ── Load HR Data (Tabs Asistencia/Comisiones) ──
  const loadHRData = async () => {
    setLoadingHR(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
      const monthStart = new Date(); monthStart.setDate(1);
      const fmt = (d: Date) => d.toISOString().split('T')[0];
      const branchIds = impersonating ? activeBranchIds : [myProfile?.sucursal_id];

      const { data: barberProfiles } = await supabase
        .from('perfiles').select('id, nombre, comision_porcentaje')
        .eq('rol', 'barbero').eq('activo', true).in('sucursal_id', branchIds);

      const { data: commissions } = await supabase
        .from('vista_comisiones_barberos').select('barbero_id, comision, venta_fecha')
        .in('sucursal_id', branchIds);

      const { data: attendance } = await supabase
        .from('asistencia').select('*, perfiles!inner(nombre)')
        .eq('fecha', today).in('sucursal_id', branchIds)
        .order('entrada_en', { ascending: false });

      setAttendanceToday(attendance || []);

      const commByBarber: Record<string, { hoy: number; semana: number; mes: number }> = {};
      (commissions || []).forEach((c: any) => {
        const id = c.barbero_id;
        if (!commByBarber[id]) commByBarber[id] = { hoy: 0, semana: 0, mes: 0 };
        const val = parseFloat(c.comision);
        const cDate = c.venta_fecha?.split('T')[0] || c.venta_fecha;
        if (cDate === today) commByBarber[id].hoy += val;
        if (cDate >= fmt(weekStart)) commByBarber[id].semana += val;
        if (cDate >= fmt(monthStart)) commByBarber[id].mes += val;
      });

      const attendanceMap: Record<string, string | null> = {};
      (attendance || []).forEach((a: any) => {
        if (!attendanceMap[a.usuario_id]) attendanceMap[a.usuario_id] = a.salida_en ? 'ended' : 'active';
      });

      setBarbers((barberProfiles || []).map((b: any) => ({
        id: b.id, nombre: b.nombre,
        comision_porcentaje: parseFloat(b.comision_porcentaje || 0),
        asistencia_hoy: attendanceMap[b.id] || null,
        comisiones_hoy: commByBarber[b.id]?.hoy || 0,
        comisiones_semana: commByBarber[b.id]?.semana || 0,
        comisiones_mes: commByBarber[b.id]?.mes || 0,
      })));
    } catch (err) {
      console.error('Error loading HR data:', err);
    } finally {
      setLoadingHR(false);
    }
  };

  useEffect(() => { if (tab !== 'personal') loadHRData(); }, [tab]);

  // ── CRUD ──
  const openNew = () => {
    setEditId(null); setFNombre(''); setFEmail(''); setFPassword('');
    setFRol('cajero'); setFComision('');
    setFSucursalId(sucursales[0]?.id || '');
    setFormError(null); setShowForm(true);
  };

  const openEdit = (s: StaffProfile) => {
    setEditId(s.id); setFNombre(s.nombre); setFEmail(s.email); setFPassword('');
    setFRol(s.rol); setFComision(s.comision_porcentaje?.toString() || '');
    setFSucursalId(s.sucursal_id); setFormError(null); setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fNombre.trim()) { setFormError(t('nameRequired')); return; }
    setSubmitting(true); setFormError(null);

    try {
      const branchIds = impersonating ? activeBranchIds : [myProfile?.sucursal_id];
      const sucursalId = fSucursalId || branchIds?.[0] || myProfile?.sucursal_id;

      if (editId) {
        const updates: any = { nombre: fNombre.trim() };
        if (fRol) updates.rol = fRol;
        if (fComision) updates.comision_porcentaje = parseFloat(fComision);
        else updates.comision_porcentaje = null;
        updates.sucursal_id = sucursalId;
        const { error } = await supabase.from('perfiles').update(updates).eq('id', editId);
        if (error) throw error;
      } else {
        const { error: fnError } = await supabase.functions.invoke('crear-empleado', {
          body: {
            email: fEmail.trim(), password: fPassword, nombre: fNombre.trim(),
            rol: fRol, sucursal_id: sucursalId,
            comision_porcentaje: fComision ? parseFloat(fComision) : undefined,
          },
        });
        if (fnError) throw new Error(typeof fnError === 'string' ? fnError : fnError.message || 'Error creating user');
        // Check for error in response
        const resp = fnError;
        if (resp && typeof resp === 'object' && (resp as any).error) throw new Error((resp as any).error);
      }

      setSuccessMsg(t('saved')); setShowForm(false); loadStaff();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setFormError(err.message || 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deleteTarget) return;
    try {
      const newState = !deleteTarget.activo;
      const { error } = await supabase.from('perfiles').update({ activo: newState }).eq('id', deleteTarget.id);
      if (error) throw error;
      setSuccessMsg(newState ? t('saved') : t('staffDeleted'));
      setDeleteTarget(null); loadStaff();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error('Error updating staff:', err);
      alert(err.message);
    }
  };

  // ── Permissions ──
  const openPermEditor = async (s: StaffProfile) => {
    setPermTarget(s);
    const { data } = await supabase.from('permisos_usuario').select('permiso, habilitado').eq('usuario_id', s.id);
    const map: Record<string, boolean> = {};
    (data || []).forEach((r: any) => { map[r.permiso] = r.habilitado; });
    PERMISOS_FIJOS.forEach(p => { if (map[p] === undefined) map[p] = false; });
    setPermValues(map);
  };

  const togglePerm = async (permiso: string) => {
    if (!permTarget) return;
    const newValue = !permValues[permiso];
    setPermValues(prev => ({ ...prev, [permiso]: newValue }));
    await supabase.from('permisos_usuario').upsert(
      { usuario_id: permTarget.id, permiso, habilitado: newValue },
      { onConflict: 'usuario_id,permiso' }
    );
  };

  // ── Password Reset ──
  const handleResetPassword = async () => {
    if (!resetTarget) return;
    setResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-reset-token', {
        body: { target_user_id: resetTarget.id },
      });
      if (error) throw error;
      setResetCode(data?.code || 'Error');
    } catch (err: any) {
      alert(err.message || 'Error');
    } finally {
      setResetting(false);
    }
  };

  const copyCode = () => {
    if (resetCode) {
      navigator.clipboard.writeText(resetCode);
      setSuccessMsg(t('codeCopied'));
      setTimeout(() => setSuccessMsg(null), 2000);
    }
  };

  // ── Filters ──
  const filteredStaff = staff.filter(s => {
    if (!showInactive && !s.activo) return false;
    if (roleFilter !== 'all' && s.rol !== roleFilter) return false;
    return s.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const activeCount = staff.filter(s => s.activo).length;

  // ── Render ──
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          {t('title')}
        </h1>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-sm flex items-center gap-2.5 shadow-sm">
          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-white p-1 border border-slate-200 rounded-xl shadow-sm w-fit">
        {(['personal', 'asistencia', 'comisiones'] as Tab[]).map((k) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              tab === k ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}>
            {t(k)}
          </button>
        ))}
      </div>

      {/* ═══ TAB: Personal ═══ */}
      {tab === 'personal' && (
        <>
          {/* Summary row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex justify-between items-start">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('total')}</p>
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-extrabold text-slate-950 font-mono">{staff.length}</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex justify-between items-start">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('areActive')}</p>
                <UserCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-extrabold text-slate-950 font-mono">{activeCount}</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <button onClick={openNew}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                <UserPlus className="w-3.5 h-3.5" />
                {t('newStaff')}
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t('search')}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-blue-500 text-xs font-medium shadow-sm placeholder:text-slate-400" />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 pointer-events-none" />
              </div>
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-600 shadow-sm focus:outline-none focus:border-blue-500">
                <option value="all">{t('filterRole')}</option>
                <option value="admin">Admin</option>
                <option value="cajero">Cajero</option>
                <option value="barbero">Barbero</option>
              </select>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-[10px] font-bold text-slate-500">{t('showInactive')}</span>
              </label>
            </div>

            {loadingStaff ? (
              <div className="flex items-center justify-center py-12 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /><span className="text-sm">{t('loading')}</span>
              </div>
            ) : filteredStaff.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs italic">{t('noStaff')}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="text-left px-5 py-3 font-bold text-slate-400 uppercase tracking-wider">{t('name')}</th>
                      <th className="text-left px-5 py-3 font-bold text-slate-400 uppercase tracking-wider">{t('email')}</th>
                      <th className="text-left px-5 py-3 font-bold text-slate-400 uppercase tracking-wider">{t('role')}</th>
                      <th className="text-left px-5 py-3 font-bold text-slate-400 uppercase tracking-wider">{t('branch')}</th>
                      <th className="text-right px-5 py-3 font-bold text-slate-400 uppercase tracking-wider">{t('commission')}</th>
                      <th className="text-center px-3 py-3 font-bold text-slate-400 uppercase tracking-wider">{t('status')}</th>
                      <th className="text-center px-3 py-3 font-bold text-slate-400 uppercase tracking-wider w-32">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStaff.map((s) => (
                      <tr key={s.id} className={`hover:bg-slate-50/50 transition-colors ${!s.activo ? 'opacity-50' : ''}`}>
                        <td className="px-5 py-3 font-bold text-slate-800">{s.nombre}</td>
                        <td className="px-5 py-3 text-slate-600">{s.email}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold border capitalize ${roleBadge[s.rol] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                            {s.rol}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-500">{s.sucursal_nombre}</td>
                        <td className="px-5 py-3 text-right font-mono font-bold text-slate-700">
                          {s.comision_porcentaje != null ? `${s.comision_porcentaje}%` : '—'}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {s.activo ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              {t('active')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 text-[10px] font-bold">
                              {t('inactive')}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-center gap-0.5">
                            <button onClick={() => openEdit(s)} disabled={!s.activo}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                              title={t('editStaff')}><Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={() => openPermEditor(s)} disabled={!s.activo}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                              title={t('permissions')}><Shield className="w-3.5 h-3.5" /></button>
                            <button onClick={() => { setResetTarget(s); setResetCode(null); }} disabled={!s.activo}
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                              title={t('resetPwd')}><Key className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setDeleteTarget(s)}
                              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                s.activo
                                  ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                  : 'text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50'
                              }`}
                              title={s.activo ? t('delete') : t('reactivate')}>
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══ TAB: Asistencia ═══ */}
      {tab === 'asistencia' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex justify-between items-start">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('barbers')}</p>
                <Users className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-2xl font-extrabold text-slate-950 font-mono">{barbers.length}</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex justify-between items-start">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('attendance')}</p>
                <UserCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-extrabold text-slate-950 font-mono">
                {attendanceToday.filter(a => !a.salida_en).length} / {barbers.length}
              </p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex justify-between items-start">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('totalCommissions')} ({t('today')})</p>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-extrabold text-slate-950 font-mono">
                {formatMoney(barbers.reduce((s, b) => s + b.comisiones_hoy, 0))}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Scissors className="w-4 h-4 text-purple-600" />
                {t('barbers')}
              </h2>
              <div className="relative w-60">
                <input type="text" placeholder={t('filterBarber')}
                  value={searchHR} onChange={(e) => setSearchHR(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-blue-500 placeholder:text-slate-400" />
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
              </div>
            </div>
            {loadingHR ? (
              <div className="flex items-center justify-center py-12 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /><span className="text-sm">{t('loading')}</span>
              </div>
            ) : barbers.filter(b => b.nombre.toLowerCase().includes(searchHR.toLowerCase())).length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs italic">Sin resultados</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {barbers.filter(b => b.nombre.toLowerCase().includes(searchHR.toLowerCase())).map((barber) => (
                  <div key={barber.id} className="px-5 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs border border-purple-100">
                        {barber.nombre.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{barber.nombre}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{t('commission')}: {barber.comision_porcentaje}%</p>
                      </div>
                    </div>
                    <div className="hidden md:flex items-center gap-2 mr-6">
                      {barber.asistencia_hoy === 'active' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {t('onDuty')}
                        </span>
                      ) : barber.asistencia_hoy === 'ended' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 text-[10px] font-bold">
                          {t('shiftEnded')}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">{t('notClockedIn')}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right hidden sm:block">
                        <p className="text-[9px] text-slate-400 font-bold uppercase">{t('week')}</p>
                        <p className="text-xs font-bold font-mono text-slate-800">{formatMoney(barber.comisiones_semana)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] text-slate-400 font-bold uppercase">{t('today')}</p>
                        <p className="text-sm font-extrabold font-mono text-purple-700">{formatMoney(barber.comisiones_hoy)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">{t('attendance')}</h2>
            </div>
            {attendanceToday.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs italic">{t('noAttendance')}</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {attendanceToday.map((a) => (
                  <div key={a.id} className="px-5 py-3 flex items-center justify-between text-xs hover:bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-50 text-slate-500 flex items-center justify-center font-bold text-[10px] border border-slate-200">
                        {a.perfiles.nombre.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="font-bold text-slate-800">{a.perfiles.nombre}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-slate-500">
                        {t('clockIn')}: <span className="font-bold text-slate-700 font-mono">{formatTime(a.entrada_en)}</span>
                      </span>
                      <span className="text-slate-500">
                        {t('clockOut')}: {a.salida_en
                          ? <span className="font-bold text-slate-700 font-mono">{formatTime(a.salida_en)}</span>
                          : <span className="text-emerald-600 font-bold">{t('onDuty')}</span>
                        }
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══ TAB: Comisiones ═══ */}
      {tab === 'comisiones' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              {t('comisiones')}
            </h2>
          </div>
          {loadingHR ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /><span className="text-sm">{t('loading')}</span>
            </div>
          ) : barbers.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs italic">Sin resultados</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left px-5 py-3 font-bold text-slate-400 uppercase tracking-wider">{t('name')}</th>
                    <th className="text-right px-5 py-3 font-bold text-slate-400 uppercase tracking-wider">{t('commission')}</th>
                    <th className="text-right px-5 py-3 font-bold text-slate-400 uppercase tracking-wider">{t('week')}</th>
                    <th className="text-right px-5 py-3 font-bold text-slate-400 uppercase tracking-wider">{t('month')}</th>
                    <th className="text-right px-5 py-3 font-bold text-slate-400 uppercase tracking-wider">{t('today')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {barbers.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3 font-bold text-slate-800">{b.nombre}</td>
                      <td className="px-5 py-3 text-right font-mono font-bold text-slate-600">{b.comision_porcentaje}%</td>
                      <td className="px-5 py-3 text-right font-mono font-bold text-slate-700">{formatMoney(b.comisiones_semana)}</td>
                      <td className="px-5 py-3 text-right font-mono font-bold text-slate-700">{formatMoney(b.comisiones_mes)}</td>
                      <td className="px-5 py-3 text-right font-mono font-extrabold text-purple-700">{formatMoney(b.comisiones_hoy)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── Create/Edit Modal ─── */}
      {showForm && createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm shadow-xl p-6 space-y-6 text-slate-800" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-950 flex items-center gap-2">
                <Users className="w-4.5 h-4.5 text-blue-600" />
                <span>{editId ? t('editStaff') : t('newStaff')}</span>
              </h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 focus:outline-none"><X className="w-4 h-4" /></button>
            </div>
            {formError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs flex items-center gap-1.5 shadow-sm">
                <AlertCircle className="w-4 h-4 text-rose-600" /><span>{formError}</span>
              </div>
            )}
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('name')} *</label>
                <input type="text" required value={fNombre} onChange={(e) => setFNombre(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-blue-500 transition-all text-xs shadow-sm" />
              </div>
              {!editId && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('email')} *</label>
                  <input type="email" required value={fEmail} onChange={(e) => setFEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-blue-500 transition-all text-xs shadow-sm" />
                </div>
              )}
              {!editId && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('resetPwd')} *</label>
                  <input type="password" required minLength={6} value={fPassword} onChange={(e) => setFPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-blue-500 transition-all text-xs shadow-sm" />
                </div>
              )}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('role')}</label>
                <select value={fRol} onChange={(e) => setFRol(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-blue-500 transition-all text-xs shadow-sm">
                  <option value="cajero">Cajero</option>
                  <option value="barbero">Barbero</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('branch')}</label>
                <select value={fSucursalId} onChange={(e) => setFSucursalId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-blue-500 transition-all text-xs shadow-sm">
                  {sucursales.map((s) => (<option key={s.id} value={s.id}>{s.nombre}</option>))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('commission')} %</label>
                <input type="number" step="0.01" min="0" max="100" value={fComision} onChange={(e) => setFComision(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-blue-500 transition-all text-xs shadow-sm" />
              </div>
              <button type="submit" disabled={submitting}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-blue-500/10 flex items-center justify-center gap-2 cursor-pointer">
                {submitting ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <span>{t('save')}</span>}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ─── Permissions Modal ─── */}
      {permTarget && createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPermTarget(null)}>
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-xl p-6 space-y-4 text-slate-800 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 sticky top-0 bg-white">
              <h3 className="text-sm font-bold text-slate-950 flex items-center gap-2">
                <Shield className="w-4.5 h-4.5 text-indigo-600" />
                <span>{t('permissions')}: {permTarget.nombre}</span>
              </h3>
              <button onClick={() => setPermTarget(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            {PERMISOS_FIJOS.map((perm) => (
              <label key={perm} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                <span className="text-xs font-semibold text-slate-700 capitalize">{perm.replace(/_/g, ' ')}</span>
                <button type="button" onClick={() => togglePerm(perm)}
                  className={`relative w-10 h-5 rounded-full transition-all cursor-pointer ${permValues[perm] ? 'bg-blue-600' : 'bg-slate-300'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${permValues[perm] ? 'translate-x-5' : ''}`} />
                </button>
              </label>
            ))}
          </div>
        </div>,
        document.body
      )}

      {/* ─── Password Reset Modal ─── */}
      {resetTarget && createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => { setResetTarget(null); setResetCode(null); }}>
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm shadow-xl p-6 space-y-4 text-slate-800" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-950 flex items-center gap-2">
                <Key className="w-4.5 h-4.5 text-amber-600" />
                <span>{t('resetPwd')}</span>
              </h3>
              <button onClick={() => { setResetTarget(null); setResetCode(null); }} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-slate-500">{resetTarget.nombre} — {resetTarget.email}</p>
            {resetCode ? (
              <div className="space-y-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">{t('codeGenerated')}</p>
                  <p className="text-3xl font-extrabold text-slate-900 font-mono tracking-[0.2em]">{resetCode}</p>
                </div>
                <button onClick={copyCode}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-all cursor-pointer">{t('codeCopied')}</button>
              </div>
            ) : (
              <button onClick={handleResetPassword} disabled={resetting}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer">
                {resetting ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <span>{t('resetPwd')}</span>}
              </button>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* ─── Deactivate/Reactivate Modal ─── */}
      {deleteTarget && createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm shadow-xl p-6 space-y-4 text-slate-800" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-rose-50 flex items-center justify-center">
                <AlertCircle className="w-4.5 h-4.5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{deleteTarget.activo ? t('confirmDelete') : t('reactivate')}</h3>
                <p className="text-xs text-slate-500">{deleteTarget.nombre}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer">{t('cancel')}</button>
              <button onClick={handleDeactivate}
                className={`flex-1 py-2.5 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
                  deleteTarget.activo ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}>
                {deleteTarget.activo ? t('delete') : t('reactivate')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
