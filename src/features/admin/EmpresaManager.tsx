import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../api/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useEmpresa } from '../../context/EmpresaContext';
import { useLanguage } from '../../context/LanguageContext';
import type { BusinessRubro } from '../../config/rubrosConfig';
import { RUBROS_CONFIG } from '../../config/rubrosConfig';
import { Building2, Plus, Eye, Search, X, AlertCircle, CheckCircle, UserPlus, LogIn } from 'lucide-react';

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

  const isSystemAdmin = profile?.rol_sistema === 'sistema_admin';

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
          {filteredEmpresas.map((empresa) => (
            <div
              key={empresa.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{empresa.nombre}</h3>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      empresa.activa ? 'text-emerald-600' : 'text-slate-400'
                    }`}
                  >
                    {empresa.activa ? t.active : t.inactive}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleViewEmpresa(empresa)}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3 h-3" />
                  <span>{t.view}</span>
                </button>
                <button
                  onClick={() => handleEnterAsAdmin(empresa)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <LogIn className="w-3 h-3" />
                  <span>{t.enterAsAdmin}</span>
                </button>
              </div>
            </div>
          ))}
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
