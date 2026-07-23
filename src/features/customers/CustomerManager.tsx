import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../api/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useEmpresa } from '../../context/EmpresaContext';
import { usePermission } from '../../context/PermissionsContext';
import {
  Users,
  Search,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Mail,
  Phone,
  MapPin,
  Truck,
  UserCheck,
} from 'lucide-react';

interface Cliente {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  sucursal_id: string;
  creado_en: string;
  updated_at: string;
}

interface Proveedor {
  id: string;
  nombre: string;
  contacto_nombre: string | null;
  telefono: string | null;
  direccion: string | null;
  sucursal_id: string;
  creado_en: string;
}

type ContactTab = 'clientes' | 'proveedores';

const translations = {
  es: {
    title: 'Clientes y Proveedores',
    subtitle: 'Directorio unificado de contactos para el control de tus clientes finales y distribuidores.',
    tabClients: 'Clientes',
    tabSuppliers: 'Proveedores',
    createClient: 'Nuevo Cliente',
    createSupplier: 'Nuevo Proveedor',
    editClient: 'Editar Cliente',
    editSupplier: 'Editar Proveedor',
    delete: 'Eliminar',
    name: 'Nombre',
    supplierName: 'Nombre del Distribuidor',
    contactName: 'Persona de Contacto',
    email: 'Correo',
    phone: 'Teléfono',
    address: 'Dirección',
    created: 'Registrado',
    actions: 'Acciones',
    noClients: 'No hay clientes registrados.',
    noSuppliers: 'No hay proveedores registrados.',
    searchClient: 'Buscar cliente por nombre o correo...',
    searchSupplier: 'Buscar proveedor por nombre o contacto...',
    loading: 'Cargando directorio...',
    save: 'Guardar',
    cancel: 'Cancelar',
    deleteConfirm: '¿Estás seguro de eliminar este registro?',
    saved: 'Registro guardado correctamente',
    deleted: 'Registro eliminado correctamente',
    nameRequired: 'El nombre es obligatorio',
    confirmDelete: 'Confirmar Eliminación',
  },
  en: {
    title: 'Customers & Suppliers',
    subtitle: 'Unified contact directory for managing end customers and suppliers.',
    tabClients: 'Customers',
    tabSuppliers: 'Suppliers',
    createClient: 'New Customer',
    createSupplier: 'New Supplier',
    editClient: 'Edit Customer',
    editSupplier: 'Edit Supplier',
    delete: 'Delete',
    name: 'Name',
    supplierName: 'Distributor Name',
    contactName: 'Contact Person',
    email: 'Email',
    phone: 'Phone',
    address: 'Address',
    created: 'Registered',
    actions: 'Actions',
    noClients: 'No customers registered.',
    noSuppliers: 'No suppliers registered.',
    searchClient: 'Search customer by name or email...',
    searchSupplier: 'Search supplier by name or contact...',
    loading: 'Loading directory...',
    save: 'Save',
    cancel: 'Cancel',
    deleteConfirm: 'Are you sure you want to delete this record?',
    saved: 'Record saved successfully',
    deleted: 'Record deleted successfully',
    nameRequired: 'Name is required',
    confirmDelete: 'Confirm Deletion',
  }
};

export const CustomerManager: React.FC = () => {
  const { profile } = useAuth();
  const { lang } = useLanguage();
  const { impersonating, activeBranchIds } = useEmpresa();
  const canManage = usePermission('gestionar_clientes');
  const t = translations[lang];

  const [activeTab, setActiveTab] = useState<ContactTab>('clientes');
  
  // Data State
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Client Modal State
  const [showClientModal, setShowClientModal] = useState(false);
  const [editClientId, setEditClientId] = useState<string | null>(null);
  const [formClientNombre, setFormClientNombre] = useState('');
  const [formClientEmail, setFormClientEmail] = useState('');
  const [formClientTelefono, setFormClientTelefono] = useState('');
  const [formClientDireccion, setFormClientDireccion] = useState('');
  const [deleteClientTarget, setDeleteClientTarget] = useState<Cliente | null>(null);

  // Supplier Modal State
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editSupplierId, setEditSupplierId] = useState<string | null>(null);
  const [formSupNombre, setFormSupNombre] = useState('');
  const [formSupContacto, setFormSupContacto] = useState('');
  const [formSupTelefono, setFormSupTelefono] = useState('');
  const [formSupDireccion, setFormSupDireccion] = useState('');
  const [deleteSupplierTarget, setDeleteSupplierTarget] = useState<Proveedor | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadDirectoryData = async () => {
    try {
      setLoading(true);
      const branchIds = impersonating ? activeBranchIds : [profile?.sucursal_id];

      // Fetch Clientes
      const { data: cData, error: cErr } = await supabase
        .from('clientes')
        .select('*')
        .in('sucursal_id', branchIds)
        .order('nombre', { ascending: true });
      if (cErr) throw cErr;
      setClientes(cData || []);

      // Fetch Proveedores
      const { data: pData, error: pErr } = await supabase
        .from('proveedores')
        .select('*')
        .in('sucursal_id', branchIds)
        .order('nombre', { ascending: true });
      if (pErr) throw pErr;
      setProveedores(pData || []);
    } catch (err) {
      console.error('Error loading contacts directory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDirectoryData();
  }, [impersonating, activeBranchIds]);

  // ─── Client Actions ──────────────────────────────────────────────
  const handleOpenNewClient = () => {
    setEditClientId(null);
    setFormClientNombre('');
    setFormClientEmail('');
    setFormClientTelefono('');
    setFormClientDireccion('');
    setFormError(null);
    setShowClientModal(true);
  };

  const handleOpenEditClient = (c: Cliente) => {
    setEditClientId(c.id);
    setFormClientNombre(c.nombre);
    setFormClientEmail(c.email || '');
    setFormClientTelefono(c.telefono || '');
    setFormClientDireccion(c.direccion || '');
    setFormError(null);
    setShowClientModal(true);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClientNombre.trim()) { setFormError(t.nameRequired); return; }
    setSubmitting(true); setFormError(null);

    try {
      const targetBranchId = impersonating && activeBranchIds.length > 0 ? activeBranchIds[0] : profile?.sucursal_id;

      if (editClientId) {
        const { error } = await supabase
          .from('clientes')
          .update({
            nombre: formClientNombre.trim(),
            email: formClientEmail.trim() || null,
            telefono: formClientTelefono.trim() || null,
            direccion: formClientDireccion.trim() || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editClientId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('clientes')
          .insert({
            nombre: formClientNombre.trim(),
            email: formClientEmail.trim() || null,
            telefono: formClientTelefono.trim() || null,
            direccion: formClientDireccion.trim() || null,
            sucursal_id: targetBranchId
          });
        if (error) throw error;
      }

      setSuccessMessage(t.saved);
      setShowClientModal(false);
      loadDirectoryData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!deleteClientTarget) return;
    try {
      const { error } = await supabase.from('clientes').delete().eq('id', deleteClientTarget.id);
      if (error) throw error;
      setSuccessMessage(t.deleted);
      setDeleteClientTarget(null);
      loadDirectoryData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // ─── Supplier Actions ────────────────────────────────────────────
  const handleOpenNewSupplier = () => {
    setEditSupplierId(null);
    setFormSupNombre('');
    setFormSupContacto('');
    setFormSupTelefono('');
    setFormSupDireccion('');
    setFormError(null);
    setShowSupplierModal(true);
  };

  const handleOpenEditSupplier = (s: Proveedor) => {
    setEditSupplierId(s.id);
    setFormSupNombre(s.nombre);
    setFormSupContacto(s.contacto_nombre || '');
    setFormSupTelefono(s.telefono || '');
    setFormSupDireccion(s.direccion || '');
    setFormError(null);
    setShowSupplierModal(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSupNombre.trim()) { setFormError(t.nameRequired); return; }
    setSubmitting(true); setFormError(null);

    try {
      const targetBranchId = impersonating && activeBranchIds.length > 0 ? activeBranchIds[0] : profile?.sucursal_id;

      if (editSupplierId) {
        const { error } = await supabase
          .from('proveedores')
          .update({
            nombre: formSupNombre.trim(),
            contacto_nombre: formSupContacto.trim() || null,
            telefono: formSupTelefono.trim() || null,
            direccion: formSupDireccion.trim() || null
          })
          .eq('id', editSupplierId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('proveedores')
          .insert({
            nombre: formSupNombre.trim(),
            contacto_nombre: formSupContacto.trim() || null,
            telefono: formSupTelefono.trim() || null,
            direccion: formSupDireccion.trim() || null,
            sucursal_id: targetBranchId
          });
        if (error) throw error;
      }

      setSuccessMessage(t.saved);
      setShowSupplierModal(false);
      loadDirectoryData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSupplier = async () => {
    if (!deleteSupplierTarget) return;
    try {
      const { error } = await supabase.from('proveedores').delete().eq('id', deleteSupplierTarget.id);
      if (error) throw error;
      setSuccessMessage(t.deleted);
      setDeleteSupplierTarget(null);
      loadDirectoryData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // ─── Filters ─────────────────────────────────────────────────────
  const filteredClientes = clientes.filter(c =>
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredProveedores = proveedores.filter(p =>
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.contacto_nombre && p.contacto_nombre.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!canManage) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-sm flex items-center gap-2.5 shadow-sm">
        <AlertCircle className="w-4.5 h-4.5 text-rose-600" />
        <span>{lang === 'es' ? 'No tienes permiso para gestionar contactos.' : 'You do not have permission to manage contacts.'}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            <span>{t.title}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">{t.subtitle}</p>
        </div>

        {/* Create Action */}
        {activeTab === 'clientes' ? (
          <button onClick={handleOpenNewClient}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-500/10 transition-all flex items-center gap-2 cursor-pointer">
            <UserCheck className="w-4 h-4" />
            <span>{t.createClient}</span>
          </button>
        ) : (
          <button onClick={handleOpenNewSupplier}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-500/10 transition-all flex items-center gap-2 cursor-pointer">
            <Truck className="w-4 h-4" />
            <span>{t.createSupplier}</span>
          </button>
        )}
      </div>

      {/* Success Alert */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-sm flex items-center gap-2.5 shadow-sm">
          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Tabs Header */}
      <div className="flex bg-white p-1 border border-slate-200 rounded-xl shadow-sm gap-1 w-fit">
        <button
          onClick={() => { setActiveTab('clientes'); setSearchTerm(''); }}
          className={`px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'clientes'
              ? 'bg-blue-50 text-blue-600 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span className="flex items-center gap-2">
            <UserCheck className="w-3.5 h-3.5" />
            <span>{t.tabClients} ({clientes.length})</span>
          </span>
        </button>
        <button
          onClick={() => { setActiveTab('proveedores'); setSearchTerm(''); }}
          className={`px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'proveedores'
              ? 'bg-blue-50 text-blue-600 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span className="flex items-center gap-2">
            <Truck className="w-3.5 h-3.5" />
            <span>{t.tabSuppliers} ({proveedores.length})</span>
          </span>
        </button>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Search Input */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="relative w-full md:w-80">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={activeTab === 'clientes' ? t.searchClient : t.searchSupplier}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all text-xs text-slate-800 shadow-sm placeholder:text-slate-400"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span className="text-sm">{t.loading}</span>
          </div>
        ) : activeTab === 'clientes' ? (
          /* TAB 1: CLIENTES TABLE */
          filteredClientes.length === 0 ? (
            <div className="p-16 text-center text-slate-400 text-xs italic">{t.noClients}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 uppercase tracking-wider font-bold">
                    <th className="text-left px-5 py-3.5">{t.name}</th>
                    <th className="text-left px-5 py-3.5">{t.email}</th>
                    <th className="text-left px-5 py-3.5">{t.phone}</th>
                    <th className="text-left px-5 py-3.5">{t.address}</th>
                    <th className="text-left px-5 py-3.5">{t.created}</th>
                    <th className="text-center px-3 py-3.5 w-24">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredClientes.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-900 flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-[10px] border border-blue-100">
                          {c.nombre.substring(0, 2).toUpperCase()}
                        </div>
                        <span>{c.nombre}</span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 font-medium">
                        {c.email ? (
                          <span className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            {c.email}
                          </span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 font-mono font-medium">
                        {c.telefono ? (
                          <span className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            {c.telefono}
                          </span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 max-w-[180px] truncate">
                        {c.direccion ? (
                          <span className="flex items-center gap-1.5" title={c.direccion}>
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{c.direccion}</span>
                          </span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 font-medium whitespace-nowrap">
                        {new Date(c.creado_en).toLocaleDateString(lang === 'es' ? 'es-PE' : 'en-US')}
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => handleOpenEditClient(c)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                            title={t.editClient}>
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDeleteClientTarget(c)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                            title={t.delete}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* TAB 2: PROVEEDORES TABLE */
          filteredProveedores.length === 0 ? (
            <div className="p-16 text-center text-slate-400 text-xs italic">{t.noSuppliers}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 uppercase tracking-wider font-bold">
                    <th className="text-left px-5 py-3.5">{t.supplierName}</th>
                    <th className="text-left px-5 py-3.5">{t.contactName}</th>
                    <th className="text-left px-5 py-3.5">{t.phone}</th>
                    <th className="text-left px-5 py-3.5">{t.address}</th>
                    <th className="text-center px-3 py-3.5 w-24">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProveedores.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-900 flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs border border-slate-200">
                          <Truck className="w-3.5 h-3.5" />
                        </div>
                        <span>{p.nombre}</span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-700 font-medium">
                        {p.contacto_nombre || <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 font-mono font-medium">
                        {p.telefono ? (
                          <span className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            {p.telefono}
                          </span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 max-w-[200px] truncate">
                        {p.direccion ? (
                          <span className="flex items-center gap-1.5" title={p.direccion}>
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{p.direccion}</span>
                          </span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => handleOpenEditSupplier(p)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                            title={t.editSupplier}>
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDeleteSupplierTarget(p)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                            title={t.delete}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Client Modal */}
      {showClientModal && createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm shadow-xl p-6 space-y-6 text-slate-800 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-950 flex items-center gap-2">
                <UserCheck className="w-4.5 h-4.5 text-blue-600" />
                <span>{editClientId ? t.editClient : t.createClient}</span>
              </h2>
              <button onClick={() => setShowClientModal(false)} className="text-slate-400 hover:text-slate-600 focus:outline-none">
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs flex items-center gap-1.5 shadow-sm">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveClient} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.name} *</label>
                <input type="text" required value={formClientNombre} onChange={(e) => setFormClientNombre(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 transition-all text-xs shadow-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.email}</label>
                <input type="email" value={formClientEmail} onChange={(e) => setFormClientEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 transition-all text-xs shadow-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.phone}</label>
                <input type="text" value={formClientTelefono} onChange={(e) => setFormClientTelefono(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 transition-all text-xs shadow-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.address}</label>
                <textarea rows={2} value={formClientDireccion} onChange={(e) => setFormClientDireccion(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 transition-all text-xs shadow-sm resize-none" />
              </div>
              <button type="submit" disabled={submitting}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-blue-500/10 flex items-center justify-center gap-2 cursor-pointer">
                {submitting ? (
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <span>{t.save}</span>
                )}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Supplier Modal */}
      {showSupplierModal && createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm shadow-xl p-6 space-y-6 text-slate-800 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-950 flex items-center gap-2">
                <Truck className="w-4.5 h-4.5 text-blue-600" />
                <span>{editSupplierId ? t.editSupplier : t.createSupplier}</span>
              </h2>
              <button onClick={() => setShowSupplierModal(false)} className="text-slate-400 hover:text-slate-600 focus:outline-none">
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs flex items-center gap-1.5 shadow-sm">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveSupplier} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.supplierName} *</label>
                <input type="text" required value={formSupNombre} onChange={(e) => setFormSupNombre(e.target.value)}
                  placeholder="Ej: Distribuidora Central"
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 transition-all text-xs shadow-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.contactName}</label>
                <input type="text" value={formSupContacto} onChange={(e) => setFormSupContacto(e.target.value)}
                  placeholder="Ej: Carlos Gómez"
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 transition-all text-xs shadow-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.phone}</label>
                <input type="text" value={formSupTelefono} onChange={(e) => setFormSupTelefono(e.target.value)}
                  placeholder="+51 987 654 321"
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 transition-all text-xs shadow-sm font-mono" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.address}</label>
                <textarea rows={2} value={formSupDireccion} onChange={(e) => setFormSupDireccion(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 transition-all text-xs shadow-sm resize-none" />
              </div>
              <button type="submit" disabled={submitting}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-blue-500/10 flex items-center justify-center gap-2 cursor-pointer">
                {submitting ? (
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <span>{t.save}</span>
                )}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Client Confirmation Modal */}
      {deleteClientTarget && createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm shadow-xl p-6 space-y-4 text-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-rose-50 flex items-center justify-center">
                <AlertCircle className="w-4.5 h-4.5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{t.confirmDelete}</h3>
                <p className="text-xs text-slate-500">{t.deleteConfirm}</p>
              </div>
            </div>
            <p className="text-xs font-bold text-slate-800 bg-slate-50 px-3 py-2 rounded-lg">{deleteClientTarget.nombre}</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteClientTarget(null)}
                className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer">
                {t.cancel}
              </button>
              <button onClick={handleDeleteClient}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer">
                {t.delete}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Supplier Confirmation Modal */}
      {deleteSupplierTarget && createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm shadow-xl p-6 space-y-4 text-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-rose-50 flex items-center justify-center">
                <AlertCircle className="w-4.5 h-4.5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{t.confirmDelete}</h3>
                <p className="text-xs text-slate-500">{t.deleteConfirm}</p>
              </div>
            </div>
            <p className="text-xs font-bold text-slate-800 bg-slate-50 px-3 py-2 rounded-lg">{deleteSupplierTarget.nombre}</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteSupplierTarget(null)}
                className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer">
                {t.cancel}
              </button>
              <button onClick={handleDeleteSupplier}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer">
                {t.delete}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

