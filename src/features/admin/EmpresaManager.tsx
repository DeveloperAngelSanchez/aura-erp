import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../api/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useEmpresa } from '../../context/EmpresaContext';
import { useLanguage } from '../../context/LanguageContext';
import type { BusinessRubro } from '../../config/rubrosConfig';
import { RUBROS_CONFIG } from '../../config/rubrosConfig';
import { Building2, Plus, Eye, Search, X, AlertCircle, CheckCircle, UserPlus, LogIn, Calendar, Clock } from 'lucide-react';

const translations = {
  es: {
    title: 'Gestión de Empresas',
    subtitle: 'Administra las empresas registradas en el sistema',
    newEmpresa: 'Nueva Empresa',
    searchPlaceholder: 'Buscar empresa...',
    noEmpresas: 'No hay empresas registradas.',
    active: 'Activa',
    inactive: 'Inactiva',
    adminAssigned: 'Admin Asignado',
    branches: 'Sucursales',
    actions: 'Acciones',
    view: 'Ver',
    enterAsAdmin: 'Ingresar como Admin',
    creating: 'Creando...',
    create: 'Crear Empresa',
    cancel: 'Cancelar',
    empresaName: 'Nombre de la Empresa',
    adminName: 'Nombre del Admin',
    adminEmail: 'Email del Admin',
    adminPassword: 'Contraseña del Admin',
    branchName: 'Nombre de la Sucursal',
    empresaCreated: 'Empresa creada exitosamente. Comparte las credenciales con el administrador.',
    errorCreating: 'Error al crear la empresa',
    users: 'Usuarios',
    confirmDelete: '¿Estás seguro de desactivar esta empresa?',
    noAdminAssigned: 'Sin admin asignado',
    enterAdmin: 'Ingresar como Admin',
    exitView: 'Salir de vista empresa',
    loading: 'Cargando...',
    createdAt: 'Fecha de Creación',
    lastActivity: 'Última Actividad',
    noActivity: 'Sin actividad operacional',
    consulting: 'Consultando...',
  },
  en: {
    title: 'Company Management',
    subtitle: 'Manage registered companies in the system',
    newEmpresa: 'New Company',
    searchPlaceholder: 'Search company...',
    noEmpresas: 'No registered companies.',
    active: 'Active',
    inactive: 'Inactive',
    adminAssigned: 'Assigned Admin',
    branches: 'Branches',
    actions: 'Actions',
    view: 'View',
    enterAsAdmin: 'Enter as Admin',
    creating: 'Creating...',
    create: 'Create Company',
    cancel: 'Cancel',
    empresaName: 'Company Name',
    adminName: 'Admin Name',
    adminEmail: 'Admin Email',
    adminPassword: 'Admin Password',
    branchName: 'Branch Name',
    empresaCreated: 'Company created successfully. The admin will receive an invitation email.',
    errorCreating: 'Error creating company',
    users: 'Users',
    confirmDelete: 'Are you sure you want to deactivate this company?',
    noAdminAssigned: 'No admin assigned',
    enterAdmin: 'Enter as Admin',
    exitView: 'Exit company view',
    loading: 'Loading...',
    createdAt: 'Creation Date',
    lastActivity: 'Last Activity',
    noActivity: 'No operational activity',
    consulting: 'Checking...',
  }
};

export const EmpresaManager: React.FC = () => {
  const { profile } = useAuth();
  const { empresas, loadingEmpresas, refreshEmpresas, setActiveEmpresa, activeEmpresaId, clearActiveEmpresa } = useEmpresa();
  const { lang } = useLanguage();
  const t = translations[lang];
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create empresa form
  const [formName, setFormName] = useState('');
  const [formRubro, setFormRubro] = useState<BusinessRubro>('barberia');
  const [formAdminNombre, setFormAdminNombre] = useState('');
  const [formAdminEmail, setFormAdminEmail] = useState('');
  const [formAdminPassword, setFormAdminPassword] = useState('');
  const [formBranchName, setFormBranchName] = useState('');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Detail modal
  const [selectedEmpresa, setSelectedEmpresa] = useState<any>(null);
  const [empresaDetail, setEmpresaDetail] = useState<{
    sucursales: any[];
    admins: any[];
    usersCount: number;
  } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Metadatos de actividad por empresa
  const [actividades, setActividades] = useState<Record<string, { fecha: string | null; tipo: 'venta' | 'turno' | 'creacion'; descripcion: string }>>({});
  const [loadingActividades, setLoadingActividades] = useState(false);

  const isSystemAdmin = profile?.rol_sistema === 'sistema_admin';

  const loadActividades = async () => {
    if (empresas.length === 0) return;
    setLoadingActividades(true);
    try {
      // 1. Obtener sucursales para mapear con cada empresa
      const { data: sucursales } = await supabase
        .from('sucursales')
        .select('id, empresa_id');

      const empresaSucursalesMap: Record<string, string[]> = {};
      (sucursales || []).forEach((s: { id: string; empresa_id: string }) => {
        if (!empresaSucursalesMap[s.empresa_id]) {
          empresaSucursalesMap[s.empresa_id] = [];
        }
        empresaSucursalesMap[s.empresa_id].push(s.id);
      });

      // 2. Para cada empresa, consultar en paralelo su última venta y último turno
      const results = await Promise.all(
        empresas.map(async (empresa) => {
          const branchIds = empresaSucursalesMap[empresa.id] || [];
          if (branchIds.length === 0) {
            return {
              empresaId: empresa.id,
              fecha: empresa.updated_at || empresa.created_at || null,
              tipo: 'creacion' as const,
              descripcion: lang === 'es' ? 'Sin sucursales registradas' : 'No branches registered',
            };
          }

          // Consultar última venta y último turno en las sucursales de esta empresa
          const [lastSaleRes, lastTurnRes] = await Promise.all([
            supabase
              .from('ventas')
              .select('creado_en')
              .in('sucursal_id', branchIds)
              .order('creado_en', { ascending: false })
              .limit(1)
              .maybeSingle(),
            supabase
              .from('caja_turnos')
              .select('abierto_en, cerrado_en')
              .in('sucursal_id', branchIds)
              .order('abierto_en', { ascending: false })
              .limit(1)
              .maybeSingle(),
          ]);

          const saleTime = lastSaleRes.data?.creado_en ? new Date(lastSaleRes.data.creado_en).getTime() : 0;
          const turnOpenTime = lastTurnRes.data?.abierto_en ? new Date(lastTurnRes.data.abierto_en).getTime() : 0;
          const turnCloseTime = lastTurnRes.data?.cerrado_en ? new Date(lastTurnRes.data.cerrado_en).getTime() : 0;
          const turnTime = Math.max(turnOpenTime, turnCloseTime);

          if (saleTime > 0 && saleTime >= turnTime) {
            return {
              empresaId: empresa.id,
              fecha: lastSaleRes.data!.creado_en,
              tipo: 'venta' as const,
              descripcion: lang === 'es' ? 'Venta en POS' : 'POS Sale',
            };
          }

          if (turnTime > 0) {
            const turnFecha = turnCloseTime >= turnOpenTime ? lastTurnRes.data!.cerrado_en! : lastTurnRes.data!.abierto_en!;
            const desc = turnCloseTime >= turnOpenTime 
              ? (lang === 'es' ? 'Cierre de caja' : 'Shift close')
              : (lang === 'es' ? 'Turno de caja abierto' : 'Active cash shift');
            return {
              empresaId: empresa.id,
              fecha: turnFecha,
              tipo: 'turno' as const,
              descripcion: desc,
            };
          }

          // Fallback a fecha de creación
          return {
            empresaId: empresa.id,
            fecha: empresa.updated_at || empresa.created_at || null,
            tipo: 'creacion' as const,
            descripcion: lang === 'es' ? 'Sin ventas ni turnos aún' : 'No sales or shifts yet',
          };
        })
      );

      const map: Record<string, { fecha: string | null; tipo: 'venta' | 'turno' | 'creacion'; descripcion: string }> = {};
      results.forEach((r) => {
        map[r.empresaId] = {
          fecha: r.fecha,
          tipo: r.tipo,
          descripcion: r.descripcion,
        };
      });
      setActividades(map);
    } catch (err) {
      console.error('Error loading empresas activity:', err);
    } finally {
      setLoadingActividades(false);
    }
  };

  useEffect(() => {
    if (isSystemAdmin && empresas.length > 0) {
      loadActividades();
    }
  }, [isSystemAdmin, empresas]);

  const formatCreationDate = (dateStr?: string | null) => {
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

  const formatActivityDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      const datePart = d.toLocaleDateString(lang === 'es' ? 'es-PE' : 'en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const timePart = d.toLocaleTimeString(lang === 'es' ? 'es-PE' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      return `${datePart} · ${timePart}`;
    } catch {
      return dateStr;
    }
  };

  const formatRelativeActivity = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return lang === 'es' ? 'hace unos seg.' : 'just now';
      if (diffMins < 60) return lang === 'es' ? `hace ${diffMins} min` : `${diffMins}m ago`;
      if (diffHours < 24) return lang === 'es' ? `hace ${diffHours} h` : `${diffHours}h ago`;
      if (diffDays === 1) return lang === 'es' ? 'ayer' : 'yesterday';
      if (diffDays < 30) return lang === 'es' ? `hace ${diffDays} d` : `${diffDays}d ago`;
      return '';
    } catch {
      return '';
    }
  };

  if (!isSystemAdmin) {
    return (
      <div className="bg-amber-50 border border-amber-200 text-amber-800 p-6 rounded-xl text-sm font-medium flex items-center gap-3">
        <AlertCircle className="w-5 h-5" />
        <span>{lang === 'es' ? 'No tienes permisos para acceder a esta sección.' : 'You do not have permission to access this section.'}</span>
      </div>
    );
  }

  const handleCreateEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!formName || !formAdminNombre || !formAdminEmail || !formAdminPassword || !formBranchName) {
      setFormError(lang === 'es' ? 'Todos los campos son obligatorios.' : 'All fields are required.');
      return;
    }

    setCreating(true);
    try {
      // 1. Create empresa + sucursal in DB con rubro
      const { data: dbResult, error: dbError } = await supabase.rpc('crear_empresa_db', {
        p_empresa_nombre: formName,
        p_sucursal_nombre: formBranchName,
        p_rubro: formRubro,
      });

      if (dbError) throw dbError;

      // 2. Create admin user via edge function
      const { error: fnError } = await supabase.functions.invoke('crear-empleado', {
        body: {
          email: formAdminEmail,
          password: formAdminPassword,
          nombre: formAdminNombre,
          rol: 'admin',
          sucursal_id: dbResult.sucursal_id,
        },
      });

      if (fnError) throw fnError;

      setFormSuccess(t.empresaCreated);
      setFormName('');
      setFormAdminNombre('');
      setFormAdminEmail('');
      setFormAdminPassword('');
      setFormBranchName('');
      refreshEmpresas();
      setTimeout(() => {
        setShowCreateModal(false);
        setFormSuccess(null);
      }, 2000);
    } catch (err: any) {
      setFormError(err.message || t.errorCreating);
    } finally {
      setCreating(false);
    }
  };

  const handleViewEmpresa = async (empresa: any) => {
    setSelectedEmpresa(empresa);
    setLoadingDetail(true);
    setEmpresaDetail(null);

    try {
      const { data: sucursalesData } = await supabase.from('sucursales').select('id, nombre').eq('empresa_id', empresa.id);

      const sucursales = sucursalesData || [];
      let admins: any[] = [];
      let usersCount = 0;

      if (sucursales.length > 0) {
        const branchIds = sucursales.map(s => s.id);
        const { data: allProfiles } = await supabase
          .from('perfiles')
          .select('id, nombre, email, rol')
          .in('sucursal_id', branchIds);

        admins = (allProfiles || []).filter((p: any) => p.rol === 'admin');
        usersCount = (allProfiles || []).length;
      }

      setEmpresaDetail({ sucursales, admins, usersCount });
    } catch (err) {
      console.error('Error loading empresa details:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleEnterAsAdmin = (empresa: any) => {
    setActiveEmpresa(empresa.id, empresa.nombre);
    setSelectedEmpresa(null);
    navigate('/admin');
  };

  const filteredEmpresas = empresas.filter(e =>
    e.nombre.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600" />
            <span>{t.title}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">{t.subtitle}</p>
        </div>
        {activeEmpresaId ? (
          <button
            onClick={clearActiveEmpresa}
            className="px-4 py-2 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>{t.exitView}</span>
          </button>
        ) : (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.newEmpresa}</span>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative w-full max-w-xs">
        <input
          type="text"
          placeholder={t.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-blue-500 text-xs shadow-sm placeholder:text-slate-400"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
      </div>

      {/* Active empresa banner */}
      {activeEmpresaId && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl text-xs font-medium flex items-center justify-between">
          <span>
            {lang === 'es' ? 'Actualmente visualizando:' : 'Currently viewing:'}{' '}
            <strong>{empresas.find(e => e.id === activeEmpresaId)?.nombre}</strong>
          </span>
          <button
            onClick={clearActiveEmpresa}
            className="px-3 py-1 bg-blue-100 hover:bg-blue-200 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
          >
            {t.exitView}
          </button>
        </div>
      )}

      {/* Empresa List */}
      {loadingEmpresas ? (
        <div className="flex items-center justify-center py-12 text-slate-400 text-xs">
          <span className="w-5 h-5 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin mr-2"></span>
          {t.loading}
        </div>
      ) : filteredEmpresas.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 text-xs italic shadow-sm">
          {t.noEmpresas}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredEmpresas.map((empresa) => {
            const actividad = actividades[empresa.id];
            const relTime = formatRelativeActivity(actividad?.fecha);

            return (
              <div
                key={empresa.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4"
              >
                <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>

                  <div className="space-y-1.5 min-w-0 flex-1">
                    {/* Nombre y Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-extrabold text-slate-900 text-sm tracking-tight truncate">
                        {empresa.nombre}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                          empresa.activa 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {empresa.activa ? t.active : t.inactive}
                      </span>
                      {empresa.rubro && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 capitalize">
                          {empresa.rubro}
                        </span>
                      )}
                    </div>

                    {/* Metadatos: Fecha de Creación & Última Actividad */}
                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500">
                      {/* Fecha de Creación */}
                      <div 
                        className="flex items-center gap-1.5" 
                        title={lang === 'es' ? 'Fecha de creación en el sistema' : 'Creation date in system'}
                      >
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-slate-400 font-medium">{t.createdAt}:</span>
                        <span className="font-bold text-slate-700 font-mono">
                          {formatCreationDate(empresa.created_at)}
                        </span>
                      </div>

                      <span className="text-slate-300 hidden sm:inline">•</span>

                      {/* Última Actividad */}
                      <div 
                        className="flex items-center gap-1.5 flex-wrap" 
                        title={lang === 'es' ? 'Fecha y hora de última actividad (ventas, turnos o cambios)' : 'Date and time of last operational activity'}
                      >
                        <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="text-slate-400 font-medium">{t.lastActivity}:</span>
                        {actividad?.fecha ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-800 font-mono">
                              {formatActivityDateTime(actividad.fecha)}
                            </span>
                            {relTime && (
                              <span className="px-1.5 py-0.2 bg-blue-50 text-blue-700 font-semibold rounded text-[10px] border border-blue-100">
                                {relTime}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400 font-medium">
                              ({actividad.descripcion})
                            </span>
                          </div>
                        ) : loadingActividades ? (
                          <span className="text-slate-400 italic text-[11px] animate-pulse">
                            {t.consulting}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">
                            {t.noActivity}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2 self-end lg:self-center shrink-0 pt-2 sm:pt-0">
                  <button
                    onClick={() => handleViewEmpresa(empresa)}
                    className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    <span>{t.view}</span>
                  </button>
                  <button
                    onClick={() => handleEnterAsAdmin(empresa)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>{t.enterAsAdmin}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-xl p-6 space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-950 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>{t.newEmpresa}</span>
              </h2>
              <button onClick={() => { setShowCreateModal(false); setFormError(null); setFormSuccess(null); }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateEmpresa} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.empresaName}</label>
                <input type="text" required value={formName} onChange={e => setFormName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold focus:outline-none focus:border-blue-500" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{lang === 'es' ? 'Rubro / Tipo de Negocio' : 'Business Vertical'}</label>
                <select value={formRubro} onChange={e => setFormRubro(e.target.value as BusinessRubro)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold focus:outline-none focus:border-blue-500">
                  {Object.values(RUBROS_CONFIG).map(r => (
                    <option key={r.id} value={r.id}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.branchName}</label>
                <input type="text" required value={formBranchName} onChange={e => setFormBranchName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold focus:outline-none focus:border-blue-500" />
              </div>
              <div className="border-t border-slate-100 pt-4 space-y-4">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <UserPlus className="w-3 h-3" />
                  <span>{lang === 'es' ? 'Admin de la empresa' : 'Company Admin'}</span>
                </h3>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.adminName}</label>
                  <input type="text" required value={formAdminNombre} onChange={e => setFormAdminNombre(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold focus:outline-none focus:border-blue-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.adminEmail}</label>
                  <input type="email" required value={formAdminEmail} onChange={e => setFormAdminEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold focus:outline-none focus:border-blue-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.adminPassword}</label>
                  <input type="password" required value={formAdminPassword} onChange={e => setFormAdminPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold cursor-pointer">
                  {t.cancel}
                </button>
                <button type="submit" disabled={creating}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-50 cursor-pointer">
                  {creating ? t.creating : t.create}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Detail Modal */}
      {selectedEmpresa && createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-xl p-6 space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-950 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>{selectedEmpresa.nombre}</span>
              </h2>
              <button onClick={() => setSelectedEmpresa(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingDetail ? (
              <div className="flex items-center justify-center py-8 text-slate-400 text-xs">
                <span className="w-5 h-5 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin mr-2"></span>
                {t.loading}
              </div>
            ) : empresaDetail ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                    <p className="text-lg font-extrabold text-slate-900">{empresaDetail.sucursales.length}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.branches}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                    <p className="text-lg font-extrabold text-slate-900">{empresaDetail.usersCount}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.users}</p>
                  </div>
                </div>

                {/* Tiempos de Creación y Actividad */}
                <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200 text-xs space-y-2">
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="font-semibold text-slate-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{t.createdAt}:</span>
                    </span>
                    <span className="font-mono font-bold text-slate-800">
                      {formatCreationDate(selectedEmpresa.created_at)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 border-t border-slate-200/60 pt-1.5">
                    <span className="font-semibold text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-500" />
                      <span>{t.lastActivity}:</span>
                    </span>
                    <span className="font-mono font-bold text-slate-800 text-right">
                      {actividades[selectedEmpresa.id]?.fecha 
                        ? `${formatActivityDateTime(actividades[selectedEmpresa.id].fecha)} (${actividades[selectedEmpresa.id].descripcion})`
                        : (loadingActividades ? t.consulting : t.noActivity)}
                    </span>
                  </div>
                </div>

                {empresaDetail.admins.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{t.adminAssigned}</p>
                    {empresaDetail.admins.map((admin: any) => (
                      <div key={admin.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                        <p className="font-bold text-slate-800">{admin.nombre}</p>
                        <p className="text-slate-400">{admin.email}</p>
                      </div>
                    ))}
                  </div>
                )}

                {empresaDetail.admins.length === 0 && (
                  <p className="text-xs text-slate-400 italic">{t.noAdminAssigned}</p>
                )}

                {empresaDetail.sucursales.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{t.branches}</p>
                    <div className="space-y-1.5">
                      {empresaDetail.sucursales.map((s: any) => (
                        <div key={s.id} className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700">
                          {s.nombre}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button onClick={() => setSelectedEmpresa(null)}
                    className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold cursor-pointer">
                    {t.cancel}
                  </button>
                  <button onClick={() => handleEnterAsAdmin(selectedEmpresa)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer">
                    <LogIn className="w-3.5 h-3.5" />
                    <span>{t.enterAsAdmin}</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
