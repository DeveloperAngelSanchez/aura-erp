import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../api/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useEmpresa } from '../../context/EmpresaContext';
import { useSettings } from '../../context/SettingsContext';
import { 
  Truck, 
  Plus, 
  Trash2, 
  Search, 
  FileText, 
  CheckCircle2, 
  AlertTriangle,
  User,
  Phone,
  MapPin,
  X,
  PlusCircle,
  History,
  ShoppingBag
} from 'lucide-react';

interface Supplier {
  id: string;
  nombre: string;
  contacto_nombre: string;
  telefono: string;
  direccion: string;
  creado_en: string;
}

interface Item {
  id: string;
  nombre: string;
  tipo: string;
  precio_venta: number;
}

interface PurchaseItemInput {
  item_id: string;
  cantidad: number;
  precio_costo: number;
}

interface PurchaseHistoryRecord {
  id: string;
  total: number;
  creado_en: string;
  proveedores: { nombre: string } | null;
  perfiles: { nombre: string } | null;
  compra_detalles: Array<{
    cantidad: number;
    precio_costo: number;
    items: { nombre: string } | null;
  }>;
}

const translations = {
  es: {
    title: 'Compras e Inventario',
    subtitle: 'Administra tus proveedores e ingresa facturas de compra para reabastecer stock.',
    tabSuppliers: 'Proveedores',
    tabNewPurchase: 'Registrar Compra',
    tabHistory: 'Historial de Compras',
    searchSupplier: 'Buscar proveedor...',
    newSupplier: 'Nuevo Proveedor',
    tableName: 'Nombre Distribuidor',
    tableContact: 'Contacto',
    tablePhone: 'Teléfono',
    tableAddress: 'Dirección',
    tableActions: 'Acciones',
    noSuppliers: 'No se encontraron proveedores.',
    supplierCreated: '¡Proveedor registrado con éxito!',
    supplierDeleted: '¡Proveedor eliminado con éxito!',
    modalTitle: 'Registrar Nuevo Proveedor',
    supplierName: 'Nombre del Distribuidor',
    contactName: 'Nombre de Contacto',
    phone: 'Teléfono de Contacto',
    address: 'Dirección Comercial',
    cancel: 'Cancelar',
    save: 'Guardar',
    purchaseCreated: '¡Compra registrada y stock actualizado con éxito!',
    selectSupplier: 'Selecciona un Proveedor',
    purchaseDetails: 'Detalles de Factura',
    addItem: 'Añadir Producto a la Factura',
    noPurchaseItems: 'Añade productos para registrar la compra.',
    tableProduct: 'Producto',
    tableQuantity: 'Cantidad',
    tableCost: 'Costo Unitario',
    tableSubtotal: 'Subtotal',
    registerPurchase: 'Registrar Factura de Compra',
    totalPurchase: 'Importe Total de Compra',
    validationError: 'Por favor, completa los campos requeridos.',
    loading: 'Cargando datos...',
    noPurchasesHistory: 'No hay historial de compras registradas.',
  },
  en: {
    title: 'Purchases & Supplies',
    subtitle: 'Manage your suppliers and register purchase invoices to restock.',
    tabSuppliers: 'Suppliers',
    tabNewPurchase: 'Register Purchase',
    tabHistory: 'Purchase History',
    searchSupplier: 'Search supplier...',
    newSupplier: 'New Supplier',
    tableName: 'Distributor Name',
    tableContact: 'Contact',
    tablePhone: 'Phone',
    tableAddress: 'Address',
    tableActions: 'Actions',
    noSuppliers: 'No suppliers found.',
    supplierCreated: 'Supplier registered successfully!',
    supplierDeleted: 'Supplier deleted successfully!',
    modalTitle: 'Register New Supplier',
    supplierName: 'Distributor Name',
    contactName: 'Contact Person Name',
    phone: 'Contact Phone Number',
    address: 'Business Address',
    cancel: 'Cancel',
    save: 'Save',
    purchaseCreated: 'Purchase registered and inventory updated successfully!',
    selectSupplier: 'Select a Supplier',
    purchaseDetails: 'Invoice Details',
    addItem: 'Add Product to Invoice',
    noPurchaseItems: 'Add products to register the purchase.',
    tableProduct: 'Product',
    tableQuantity: 'Quantity',
    tableCost: 'Unit Cost',
    tableSubtotal: 'Subtotal',
    registerPurchase: 'Register Purchase Invoice',
    totalPurchase: 'Total Purchase Amount',
    validationError: 'Please complete all required fields.',
    loading: 'Loading data...',
    noPurchasesHistory: 'No purchase history recorded.',
  }
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

export const PurchaseManager: React.FC = () => {
  const { profile } = useAuth();
  const { lang } = useLanguage();
  const { impersonating, activeBranchIds } = useEmpresa();
  const { formatMoney } = useSettings();
  const t = translations[lang];

  const [activeTab, setActiveTab] = useState<'suppliers' | 'purchase' | 'history'>('suppliers');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [itemsList, setItemsList] = useState<Item[]>([]);
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Supplier Search and Form States
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [supplierNameInput, setSupplierNameInput] = useState('');
  const [contactNameInput, setContactNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Purchase Form States
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItemInput[]>([]);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  const loadSuppliersAndProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch suppliers
      const { data: supplierData, error: supErr } = await supabase
        .from('proveedores')
        .select('*')
        .in('sucursal_id', impersonating ? activeBranchIds : [profile?.sucursal_id])
        .order('nombre', { ascending: true });

      if (supErr) throw supErr;
      setSuppliers(supplierData || []);

      // Fetch products (type = 'producto') from catalog
      const { data: itemData, error: itemErr } = await supabase
        .from('items')
        .select('*')
        .eq('tipo', 'producto')
        .in('sucursal_id', impersonating ? activeBranchIds : [profile?.sucursal_id])
        .order('nombre', { ascending: true });

      if (itemErr) throw itemErr;
      setItemsList(itemData || []);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || 'Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const loadPurchaseHistory = async () => {
    try {
      setLoadingHistory(true);
      const { data, error: hErr } = await supabase
        .from('compras')
        .select(`
          id,
          total,
          creado_en,
          proveedores (nombre),
          perfiles:usuario_id (nombre),
          compra_detalles (
            cantidad,
            precio_costo,
            items (nombre)
          )
        `)
        .in('sucursal_id', impersonating ? activeBranchIds : [profile?.sucursal_id])
        .order('creado_en', { ascending: false });

      if (hErr) throw hErr;
      setPurchaseHistory((data as any) || []);
    } catch (err: any) {
      console.error('Error loading purchase history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadSuppliersAndProducts();
    loadPurchaseHistory();
  }, []);

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!supplierNameInput) {
      setFormError(t.validationError);
      return;
    }

    try {
      const targetBranchId = impersonating && activeBranchIds.length > 0 ? activeBranchIds[0] : profile?.sucursal_id;
      const { error: insertErr } = await supabase
        .from('proveedores')
        .insert({
          sucursal_id: targetBranchId,
          nombre: supplierNameInput,
          contacto_nombre: contactNameInput,
          telefono: phoneInput,
          direccion: addressInput
        });

      if (insertErr) throw insertErr;

      setSuccess(t.supplierCreated);
      setShowAddSupplierModal(false);
      resetSupplierForm();
      loadSuppliersAndProducts();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error saving supplier:', err);
      setFormError(err.message || 'Error saving supplier');
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!window.confirm(lang === 'es' ? '¿Estás seguro de eliminar este proveedor?' : 'Are you sure you want to delete this supplier?')) return;

    try {
      const { error: delErr } = await supabase
        .from('proveedores')
        .delete()
        .eq('id', id);

      if (delErr) throw delErr;

      setSuccess(t.supplierDeleted);
      loadSuppliersAndProducts();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error deleting supplier:', err);
      setError(err.message || 'Error deleting supplier');
    }
  };

  const resetSupplierForm = () => {
    setSupplierNameInput('');
    setContactNameInput('');
    setPhoneInput('');
    setAddressInput('');
    setFormError(null);
  };

  // Purchase Actions
  const handleAddPurchaseItem = () => {
    if (itemsList.length === 0) return;
    setPurchaseItems([
      ...purchaseItems,
      { item_id: itemsList[0].id, cantidad: 1, precio_costo: 0 }
    ]);
  };

  const handleRemovePurchaseItem = (index: number) => {
    setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
  };

  const handlePurchaseItemChange = (index: number, field: keyof PurchaseItemInput, value: any) => {
    const updated = [...purchaseItems];
    updated[index] = { ...updated[index], [field]: value };
    setPurchaseItems(updated);
  };

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setPurchaseError(null);

    if (!selectedSupplierId || purchaseItems.length === 0) {
      setPurchaseError(t.validationError);
      return;
    }

    // Validate inputs
    for (const item of purchaseItems) {
      if (item.cantidad <= 0 || item.precio_costo < 0) {
        setPurchaseError(lang === 'es' ? 'La cantidad debe ser > 0 y el costo >= 0.' : 'Quantity must be > 0 and cost >= 0.');
        return;
      }
    }

    try {
      const totalCost = purchaseItems.reduce((sum, item) => sum + (item.cantidad * item.precio_costo), 0);

      // 1. Insert header
      const targetBranchId = impersonating && activeBranchIds.length > 0 ? activeBranchIds[0] : profile?.sucursal_id;
      const { data: purchaseData, error: headerErr } = await supabase
        .from('compras')
        .insert({
          sucursal_id: targetBranchId,
          proveedor_id: selectedSupplierId,
          usuario_id: profile?.id,
          total: totalCost
        })
        .select()
        .single();

      if (headerErr) throw headerErr;

      // 2. Insert details
      const details = purchaseItems.map((item) => ({
        compra_id: purchaseData.id,
        item_id: item.item_id,
        cantidad: item.cantidad,
        precio_costo: item.precio_costo
      }));

      const { error: detailsErr } = await supabase
        .from('compra_detalles')
        .insert(details);

      if (detailsErr) throw detailsErr;

      setSuccess(t.purchaseCreated);
      setSelectedSupplierId('');
      setPurchaseItems([]);
      setActiveTab('history');
      loadSuppliersAndProducts();
      loadPurchaseHistory();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error saving purchase:', err);
      setPurchaseError(err.message || 'Error saving purchase');
    }
  };

  const calculateTotal = () => {
    return purchaseItems.reduce((sum, item) => sum + (item.cantidad * item.precio_costo), 0);
  };

  const filteredSuppliers = suppliers.filter((sup) =>
    sup.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (sup.contacto_nombre && sup.contacto_nombre.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Banner Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
            <span>{lang === 'es' ? 'Inventario' : 'Inventory'}</span>
            <span>/</span>
            <span className="text-slate-600 font-semibold">{lang === 'es' ? 'Compras' : 'Purchases'}</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight mt-1">{t.title}</h1>
          <p className="text-sm text-slate-500 mt-1">{t.subtitle}</p>
        </div>

        <div className="flex bg-white p-1 border border-slate-200 rounded-xl shadow-sm">
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'suppliers'
                ? 'bg-blue-50 text-blue-600 border border-blue-100/30'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.tabSuppliers}
          </button>
          <button
            onClick={() => setActiveTab('purchase')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'purchase'
                ? 'bg-blue-50 text-blue-600 border border-blue-100/30'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.tabNewPurchase}
          </button>
          <button
            onClick={() => { setActiveTab('history'); loadPurchaseHistory(); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-blue-50 text-blue-600 border border-blue-100/30'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.tabHistory}
          </button>
        </div>
      </div>

      {/* Success/Error Alerts */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-sm flex items-center gap-2.5 shadow-sm">
          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-sm flex items-center gap-2.5 shadow-sm">
          <AlertTriangle className="w-4.5 h-4.5 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Tab 1: Supplier Manager */}
      {activeTab === 'suppliers' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="relative w-full md:w-80">
              <input
                type="text"
                placeholder={t.searchSupplier}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all text-xs text-slate-800 shadow-sm placeholder:text-slate-400"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            </div>

            <button
              onClick={() => setShowAddSupplierModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-500/10 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{t.newSupplier}</span>
            </button>
          </div>

          {/* Supplier Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="p-16 text-center text-slate-400">
                <span className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin inline-block mb-3"></span>
                <p className="text-xs">{t.loading}</p>
              </div>
            ) : filteredSuppliers.length === 0 ? (
              <div className="p-16 text-center text-slate-400 text-xs italic">
                {t.noSuppliers}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
                      <th className="py-4 px-6">{t.tableName}</th>
                      <th className="py-4 px-6">{t.tableContact}</th>
                      <th className="py-4 px-6">{t.tablePhone}</th>
                      <th className="py-4 px-6">{t.tableAddress}</th>
                      <th className="py-4 px-6 text-center">{t.tableActions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSuppliers.map((sup) => (
                      <tr key={sup.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6 font-bold text-slate-900 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-150 flex items-center justify-center shadow-sm">
                            <Truck className="w-4 h-4 text-slate-500" />
                          </div>
                          <span>{sup.nombre}</span>
                        </td>
                        <td className="py-4 px-6 text-slate-600 font-medium">{sup.contacto_nombre || '-'}</td>
                        <td className="py-4 px-6 text-slate-600 font-mono font-medium">{sup.telefono || '-'}</td>
                        <td className="py-4 px-6 text-slate-500 max-w-xs truncate">{sup.direccion || '-'}</td>
                        <td className="py-4 px-6 text-center">
                          <button
                            onClick={() => handleDeleteSupplier(sup.id)}
                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                            title={lang === 'es' ? 'Eliminar' : 'Delete'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Purchase Registration Form */}
      {activeTab === 'purchase' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 max-w-4xl mx-auto space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-950 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <span>{t.tabNewPurchase}</span>
            </h2>
          </div>

          {purchaseError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl text-xs flex items-center gap-2 shadow-sm">
              <AlertTriangle className="w-4.5 h-4.5 text-rose-600" />
              <span>{purchaseError}</span>
            </div>
          )}

          <form onSubmit={handleSavePurchase} className="space-y-6">
            
            {/* Supplier Selector */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {t.selectSupplier}
              </label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 transition-all text-xs shadow-sm cursor-pointer"
              >
                <option value="">-- {lang === 'es' ? 'Elige un distribuidor' : 'Choose a supplier'} --</option>
                {suppliers.map((sup) => (
                  <option key={sup.id} value={sup.id}>{sup.nombre}</option>
                ))}
              </select>
            </div>

            {/* Purchase Details Grid */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {t.purchaseDetails}
                </h3>
                <button
                  type="button"
                  onClick={handleAddPurchaseItem}
                  disabled={itemsList.length === 0}
                  className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl text-[10px] font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>{t.addItem}</span>
                </button>
              </div>

              {purchaseItems.length === 0 ? (
                <div className="p-8 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-xs italic">
                  {t.noPurchaseItems}
                </div>
              ) : (
                <div className="space-y-3">
                  {purchaseItems.map((comp, idx) => (
                    <div key={idx} className="flex flex-col md:flex-row gap-3 items-end bg-slate-50/50 p-4 rounded-xl border border-slate-200 relative">
                      
                      {/* Product selection */}
                      <div className="flex-1 w-full space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                          {t.tableProduct}
                        </span>
                        <select
                          value={comp.item_id}
                          onChange={(e) => handlePurchaseItemChange(idx, 'item_id', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-none focus:border-blue-500 shadow-sm"
                        >
                          {itemsList.map((item) => (
                            <option key={item.id} value={item.id}>{item.nombre}</option>
                          ))}
                        </select>
                      </div>

                      {/* Quantity input */}
                      <div className="w-full md:w-28 space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block md:text-center">
                          {t.tableQuantity}
                        </span>
                        <input
                          type="number"
                          min="1"
                          required
                          value={comp.cantidad}
                          onChange={(e) => handlePurchaseItemChange(idx, 'cantidad', parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs text-center font-mono font-bold shadow-sm"
                        />
                      </div>

                      {/* Cost price input */}
                      <div className="w-full md:w-36 space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block md:text-center">
                          {t.tableCost}
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder="0.00"
                          value={comp.precio_costo === 0 ? '' : comp.precio_costo}
                          onChange={(e) => handlePurchaseItemChange(idx, 'precio_costo', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs text-center font-mono font-bold shadow-sm"
                        />
                      </div>

                      {/* Subtotal display */}
                      <div className="w-full md:w-28 space-y-1 text-right">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                          {t.tableSubtotal}
                        </span>
                        <div className="px-3 py-1.5 text-xs text-slate-800 font-mono font-bold">
                          {formatMoney(comp.cantidad * comp.precio_costo)}
                        </div>
                      </div>

                      {/* Remove item button */}
                      <button
                        type="button"
                        onClick={() => handleRemovePurchaseItem(idx)}
                        className="p-2 hover:bg-slate-200 text-slate-400 hover:text-rose-600 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {/* Summary cost */}
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{t.totalPurchase}</span>
                    <span className="text-xl font-extrabold text-slate-950 font-mono">{formatMoney(calculateTotal())}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setSelectedSupplierId('');
                  setPurchaseItems([]);
                  setActiveTab('suppliers');
                }}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                disabled={purchaseItems.length === 0}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t.registerPurchase}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 3: Purchase History */}
      {activeTab === 'history' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" />
              <span>{t.tabHistory}</span>
            </h2>
            <span className="text-[10px] text-slate-400 font-medium">{purchaseHistory.length} registros</span>
          </div>

          {loadingHistory ? (
            <div className="p-16 text-center text-slate-400">
              <span className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin inline-block mb-3"></span>
              <p className="text-xs">{t.loading}</p>
            </div>
          ) : purchaseHistory.length === 0 ? (
            <div className="p-16 text-center text-slate-400 text-xs italic">
              {t.noPurchasesHistory}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
                    <th className="py-4 px-6">{lang === 'es' ? 'Fecha' : 'Date'}</th>
                    <th className="py-4 px-6">{lang === 'es' ? 'Proveedor' : 'Supplier'}</th>
                    <th className="py-4 px-6">{lang === 'es' ? 'Registrado por' : 'Registered By'}</th>
                    <th className="py-4 px-6">{lang === 'es' ? 'Detalle de Compra' : 'Items Purchased'}</th>
                    <th className="py-4 px-6 text-right">{lang === 'es' ? 'Total' : 'Total'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {purchaseHistory.map((p) => {
                    const itemsSummary = (p.compra_detalles || [])
                      .map(d => `${d.cantidad}x ${d.items?.nombre || 'Producto'}`)
                      .join(', ');

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6 text-slate-600 font-medium whitespace-nowrap">
                          {formatDate(p.creado_en)}
                        </td>
                        <td className="py-4 px-6 font-bold text-slate-900 flex items-center gap-2">
                          <Truck className="w-3.5 h-3.5 text-blue-500" />
                          <span>{p.proveedores?.nombre || '—'}</span>
                        </td>
                        <td className="py-4 px-6 text-slate-700 font-medium">
                          {p.perfiles?.nombre || '—'}
                        </td>
                        <td className="py-4 px-6 text-slate-600 max-w-xs truncate" title={itemsSummary}>
                          <span className="flex items-center gap-1.5">
                            <ShoppingBag className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                            <span className="truncate">{itemsSummary || '—'}</span>
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right font-mono font-extrabold text-emerald-600 whitespace-nowrap">
                          {formatMoney(p.total)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal dialog for Supplier Registration */}
      {showAddSupplierModal && createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-xl p-6 overflow-y-auto max-h-[90vh] space-y-6 text-slate-800 animate-in fade-in zoom-in duration-205">
            
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-950 flex items-center gap-2">
                <Truck className="w-5 h-5 text-slate-600" />
                <span>{t.modalTitle}</span>
              </h2>
              <button
                onClick={() => { setShowAddSupplierModal(false); resetSupplierForm(); }}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl text-xs flex items-center gap-2 shadow-sm">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveSupplier} className="space-y-4">
              
              {/* Supplier Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {t.supplierName} *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Distribuidora de Belleza G&S"
                    value={supplierNameInput}
                    onChange={(e) => setSupplierNameInput(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 transition-all text-xs shadow-sm"
                  />
                  <Truck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                </div>
              </div>

              {/* Contact Person Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {t.contactName}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Juan Pérez"
                    value={contactNameInput}
                    onChange={(e) => setContactNameInput(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 transition-all text-xs shadow-sm"
                  />
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {t.phone}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="+54 9 11 5555-5555"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 transition-all text-xs shadow-sm font-mono"
                  />
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                </div>
              </div>

              {/* Address */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {t.address}
                </label>
                <div className="relative">
                  <textarea
                    placeholder="Av. Santa Fe 1234, CABA"
                    value={addressInput}
                    onChange={(e) => setAddressInput(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 transition-all text-xs shadow-sm min-h-[80px]"
                  />
                  <MapPin className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setShowAddSupplierModal(false); resetSupplierForm(); }}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 transition-all"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
