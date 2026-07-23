import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useResizableColumns } from '../../hooks/useResizableColumns';

type CatalogCol = 'checkbox' | 'photo' | 'name' | 'type' | 'stockInitial' | 'stockActual' | 'stockMin' | 'cost' | 'price' | 'actions';

const initialCatalogColWidths: Record<CatalogCol, number> = {
  checkbox: 48,
  photo: 64,
  name: 240,
  type: 140,
  stockInitial: 120,
  stockActual: 150,
  stockMin: 120,
  cost: 130,
  price: 130,
  actions: 100,
};
import { supabase } from '../../api/supabaseClient';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useEmpresa } from '../../context/EmpresaContext';
import { 
  Package, 
  Scissors, 
  Gift, 
  Search, 
  Plus, 
  Trash2, 
  X, 
  AlertTriangle, 
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Percent,
  Coins,
  Boxes,
  Sliders,
} from 'lucide-react';

interface Item {
  id: string;
  sucursal_id: string;
  nombre: string;
  tipo: 'producto' | 'servicio' | 'kit';
  precio_venta: number;
  stock_actual: number;
  stock_inicial?: number;
  stock_minimo?: number;
  precio_costo?: number;
  foto_url?: string | null;
  moneda?: string | null;
  inventariable?: boolean;
  comisionable?: boolean;
  creado_en: string;
  vista_stock_kits?: any;
}

interface ComponentInput {
  componente_hijo_id: string;
  cantidad_requerida: number;
}

const translations = {
  es: {
    title: 'Catálogo de Items',
    subtitle: 'Administra los productos, servicios y combos (kits) de la barbería.',
    export: 'Exportar',
    newItem: 'Nuevo Item',
    filterAll: 'Todos los tipos',
    filterProduct: 'Productos',
    filterService: 'Servicios',
    filterKit: 'Kits / Combos',
    searchPlaceholder: 'Buscar item...',
    tableName: 'Nombre',
    tableType: 'Tipo',
    tableStock: 'Inventario',
    tablePrice: 'Precio de Venta',
    tableActions: 'Acciones',
    tablePhoto: 'Foto',
    tableStockInitial: 'Stock Inicial',
    tableStockActual: 'Stock Actual',
    tableStockMin: 'Stock Mínimo',
    tableCost: 'Precio Costo',
    noStock: 'Agotado',
    inStock: 'en stock',
    notApplicable: 'N/A (Servicio)',
    createdSuccess: '¡Item creado con éxito!',
    updatedSuccess: '¡Item actualizado con éxito!',
    deleteSuccess: '¡Item eliminado con éxito!',
    modalTitle: 'Agregar Nuevo Item al Catálogo',
    modalTitleEdit: 'Editar Item del Catálogo',
    modalName: 'Nombre del Item',
    modalType: 'Tipo',
    modalPrice: 'Precio de Venta',
    modalStock: 'Inventario Inicial',
    modalStockMin: 'Inventario Mínimo',
    modalCost: 'Precio de Costo',
    modalFoto: 'URL de la Foto (Opcional)',
    modalKitComponents: 'Componentes del Combo/Kit',
    modalAddComponent: 'Agregar Producto al Kit',
    modalComponentLabel: 'Producto componente',
    modalQuantityLabel: 'Cantidad requerida',
    cancel: 'Cancelar',
    save: 'Guardar',
    noItems: 'No se encontraron items en el catálogo.',
    loading: 'Cargando catálogo...',
    validationError: 'Por favor, completa todos los campos obligatorios.',
  },
  en: {
    title: 'Catalog of Items',
    subtitle: 'Manage the barbershop products, services, and combos (kits).',
    export: 'Export',
    newItem: 'New Item',
    filterAll: 'All Types',
    filterProduct: 'Products',
    filterService: 'Services',
    filterKit: 'Kits / Combos',
    searchPlaceholder: 'Search item...',
    tableName: 'Name',
    tableType: 'Type',
    tableStock: 'Inventory',
    tablePrice: 'Retail Price',
    tableActions: 'Actions',
    tablePhoto: 'Photo',
    tableStockInitial: 'Initial Stock',
    tableStockActual: 'Current Stock',
    tableStockMin: 'Min Stock',
    tableCost: 'Cost Price',
    noStock: 'Out of Stock',
    inStock: 'in stock',
    notApplicable: 'N/A (Service)',
    createdSuccess: 'Item created successfully!',
    updatedSuccess: 'Item updated successfully!',
    deleteSuccess: 'Item deleted successfully!',
    modalTitle: 'Add New Item to Catalog',
    modalTitleEdit: 'Edit Catalog Item',
    modalName: 'Item Name',
    modalType: 'Type',
    modalPrice: 'Retail Price',
    modalStock: 'Initial Inventory',
    modalStockMin: 'Minimum Inventory',
    modalCost: 'Cost Price',
    modalFoto: 'Photo URL (Optional)',
    modalKitComponents: 'Kit Components',
    modalAddComponent: 'Add Product to Kit',
    modalComponentLabel: 'Component product',
    modalQuantityLabel: 'Required quantity',
    cancel: 'Cancel',
    save: 'Save',
    noItems: 'No items found in the catalog.',
    loading: 'Loading catalog...',
    validationError: 'Please complete all required fields.',
  }
};

export const CatalogManager: React.FC = () => {
  const { profile } = useAuth();
  const { lang } = useLanguage();
  const { formatMoney, config } = useSettings();
  const { impersonating, activeBranchIds } = useEmpresa();
  const t = translations[lang];
  const { columnWidths, handleMouseDown } = useResizableColumns<CatalogCol>(initialCatalogColWidths, 'col_widths_catalog');

  // List states
  const [items, setItems] = useState<Item[]>([]);
  const [productsList, setProductsList] = useState<Item[]>([]); // For Kit component selector
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modal Form States (Slide-over panel)
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<'producto' | 'servicio' | 'kit'>('producto');
  const [precioVenta, setPrecioVenta] = useState('');
  
  // Productos avanzados & Toggles
  const [inventariable, setInventariable] = useState(true);
  const [comisionable, setComisionable] = useState(true);
  const [stockActual, setStockActual] = useState('0');
  const [stockMinimo, setStockMinimo] = useState('0');
  const [precioCosto, setPrecioCosto] = useState('0');
  const [fotoUrl, setFotoUrl] = useState('');
  const [itemMoneda, setItemMoneda] = useState('S/.');
  
  const [kitComponents, setKitComponents] = useState<ComponentInput[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const loadCatalog = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch items
      const { data: itemsData, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .in('sucursal_id', impersonating ? activeBranchIds : [profile?.sucursal_id])
        .order('creado_en', { ascending: false });

      if (itemsError) throw itemsError;

      // 2. Fetch calculated stocks for kits
      const { data: kitsStockData, error: kitsError } = await supabase
        .from('vista_stock_kits')
        .select('*');

      if (kitsError) throw kitsError;

      // 3. Map calculated stocks in memory to bypass PostgREST relationship ambiguity on views
      const mappedItems = (itemsData || []).map((item: any) => {
        if (item.tipo === 'kit') {
          const kitStock = (kitsStockData || []).find((k: any) => k.kit_id === item.id);
          return {
            ...item,
            vista_stock_kits: {
              stock_calculado: kitStock?.stock_calculado ?? 0
            }
          };
        }
        return item;
      });

      setItems(mappedItems);
      
      // Store all products and services for use inside the Kit component dropdown
      const productsAndServices = mappedItems.filter((item: any) => item.tipo === 'producto' || item.tipo === 'servicio');
      setProductsList(productsAndServices);
    } catch (err: any) {
      console.error('Error loading catalog:', err);
      setError(err.message || 'Error loading data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();

    // Realtime subscription: auto-reload on any change to the items table
    const channel = supabase
      .channel('catalog-items-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => {
        loadCatalog();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAddComponent = () => {
    if (productsList.length === 0) return;
    setKitComponents([
      ...kitComponents,
      { componente_hijo_id: productsList[0].id, cantidad_requerida: 1 }
    ]);
  };

  const handleRemoveComponent = (index: number) => {
    setKitComponents(kitComponents.filter((_, i) => i !== index));
  };

  const handleComponentChange = (index: number, field: keyof ComponentInput, value: any) => {
    const updated = [...kitComponents];
    updated[index] = { ...updated[index], [field]: value };
    setKitComponents(updated);
  };

  const handleEditItem = async (item: Item) => {
    setEditingItemId(item.id);
    setNombre(item.nombre);
    setTipo(item.tipo);
    setInventariable(item.inventariable ?? (item.tipo !== 'servicio'));
    setComisionable(item.comisionable !== false);
    setPrecioVenta(item.precio_venta.toString());
    setStockActual(item.stock_actual.toString());
    setStockMinimo((item.stock_minimo ?? 0).toString());
    setPrecioCosto((item.precio_costo ?? 0).toString());
    setFotoUrl(item.foto_url || '');
    setItemMoneda(item.moneda || config.moneda_simbolo || 'S/.');
    setFormError(null);

    // Load kit components if it is a kit
    if (item.tipo === 'kit') {
      try {
        const { data: comps } = await supabase
          .from('kit_composicion')
          .select('componente_hijo_id, cantidad_requerida')
          .eq('kit_padre_id', item.id);
        setKitComponents(comps || []);
      } catch {
        setKitComponents([]);
      }
    } else {
      setKitComponents([]);
    }

    setShowAddModal(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!nombre || !precioVenta) {
      setFormError(t.validationError);
      return;
    }

    try {
      const price = parseFloat(precioVenta);
      const isInventariable = tipo === 'servicio' ? false : inventariable;
      const stock = (tipo === 'producto' && isInventariable) ? parseInt(stockActual) : 0;
      const minStock = (tipo === 'producto' && isInventariable) ? parseInt(stockMinimo) : 0;
      const cost = (tipo === 'producto' && isInventariable) ? parseFloat(precioCosto) : 0;
      const url = (tipo === 'producto' && isInventariable) && fotoUrl.trim() !== '' ? fotoUrl.trim() : null;

      if (isNaN(price) || price < 0) {
        setFormError(lang === 'es' ? 'El precio debe ser un número válido >= 0' : 'Price must be a valid number >= 0');
        return;
      }

      if (editingItemId) {
        // ── UPDATE MODE ──
        const { error: updateError } = await supabase
          .from('items')
          .update({
            nombre,
            tipo,
            precio_venta: price,
            stock_actual: stock,
            stock_minimo: minStock,
            precio_costo: cost,
            foto_url: url,
            moneda: itemMoneda,
            inventariable: isInventariable,
            comisionable: comisionable
          })
          .eq('id', editingItemId);

        if (updateError) throw updateError;

        // Sync kit compositions: delete old, insert new
        if (tipo === 'kit') {
          await supabase.from('kit_composicion').delete().eq('kit_padre_id', editingItemId);
          if (kitComponents.length > 0) {
            const compositions = kitComponents.map((comp) => ({
              kit_padre_id: editingItemId,
              componente_hijo_id: comp.componente_hijo_id,
              cantidad_requerida: comp.cantidad_requerida
            }));
            const { error: compError } = await supabase.from('kit_composicion').insert(compositions);
            if (compError) throw compError;
          }
        }

        setSuccess(t.updatedSuccess);
      } else {
        // ── CREATE MODE ──
        const targetBranchId = impersonating && activeBranchIds.length > 0 ? activeBranchIds[0] : profile?.sucursal_id;
        const { data: insertedItem, error: insertError } = await supabase
          .from('items')
          .insert({
            sucursal_id: targetBranchId,
            nombre,
            tipo,
            precio_venta: price,
            stock_actual: stock,
            stock_inicial: stock,
            stock_minimo: minStock,
            precio_costo: cost,
            foto_url: url,
            moneda: itemMoneda,
            inventariable: isInventariable,
            comisionable: comisionable
          })
          .select()
          .single();

        if (insertError) throw insertError;

        if (tipo === 'kit' && kitComponents.length > 0) {
          const compositions = kitComponents.map((comp) => ({
            kit_padre_id: insertedItem.id,
            componente_hijo_id: comp.componente_hijo_id,
            cantidad_requerida: comp.cantidad_requerida
          }));
          const { error: compError } = await supabase.from('kit_composicion').insert(compositions);
          if (compError) throw compError;
        }

        setSuccess(t.createdSuccess);
      }

      setShowAddModal(false);
      resetForm();
      loadCatalog();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error saving item:', err);
      setFormError(err.message || 'Error saving item');
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm(lang === 'es' ? '¿Estás seguro de eliminar este item?' : 'Are you sure you want to delete this item?')) return;

    try {
      const { error: deleteError } = await supabase
        .from('items')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setSuccess(t.deleteSuccess);
      loadCatalog();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error deleting item:', err);
      setError(err.message || 'Error deleting item');
    }
  };

  const resetForm = () => {
    setEditingItemId(null);
    setNombre('');
    setTipo('producto');
    setInventariable(true);
    setComisionable(true);
    setPrecioVenta('');
    setStockActual('0');
    setStockMinimo('0');
    setPrecioCosto('0');
    setFotoUrl('');
    setItemMoneda(config.moneda_simbolo || 'S/.');
    setKitComponents([]);
    setFormError(null);
  };

  // Filter & Search Logic
  const filteredItems = items.filter((item) => {
    const matchesSearch = item.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || item.tipo === selectedType;
    return matchesSearch && matchesType;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-950 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            <span>{t.title}</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {t.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t.newItem}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-xs flex items-center gap-2 shadow-xs">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs flex items-center gap-2 shadow-xs animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        
        {/* Filters and Search Bar */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs placeholder:text-slate-400 font-medium"
            />
          </div>

          {/* Type Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: t.filterAll },
              { id: 'producto', label: t.filterProduct },
              { id: 'servicio', label: t.filterService },
              { id: 'kit', label: t.filterKit },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setSelectedType(tab.id); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedType === tab.id
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table View */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium">
            {t.loading}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium">
            {t.noItems}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-slate-500 font-extrabold uppercase tracking-wider text-[10px]">
                  <th style={{ width: columnWidths.photo }} className="py-3.5 px-4 text-center select-none relative group whitespace-nowrap">
                    {t.tablePhoto}
                    <div onMouseDown={(e) => handleMouseDown('photo', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize opacity-0 group-hover:opacity-100 hover:bg-blue-500/30 transition-opacity" />
                  </th>
                  <th style={{ width: columnWidths.name }} className="py-3.5 px-4 select-none relative group whitespace-nowrap">
                    {t.tableName}
                    <div onMouseDown={(e) => handleMouseDown('name', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize opacity-0 group-hover:opacity-100 hover:bg-blue-500/30 transition-opacity" />
                  </th>
                  <th style={{ width: columnWidths.type }} className="py-3.5 px-4 select-none relative group whitespace-nowrap">
                    {t.tableType}
                    <div onMouseDown={(e) => handleMouseDown('type', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize opacity-0 group-hover:opacity-100 hover:bg-blue-500/30 transition-opacity" />
                  </th>
                  <th style={{ width: columnWidths.stockInitial }} className="py-3.5 px-4 text-center select-none relative group whitespace-nowrap">
                    {t.tableStockInitial}
                    <div onMouseDown={(e) => handleMouseDown('stockInitial', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize opacity-0 group-hover:opacity-100 hover:bg-blue-500/30 transition-opacity" />
                  </th>
                  <th style={{ width: columnWidths.stockActual }} className="py-3.5 px-4 text-center select-none relative group whitespace-nowrap">
                    {t.tableStockActual}
                    <div onMouseDown={(e) => handleMouseDown('stockActual', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize opacity-0 group-hover:opacity-100 hover:bg-blue-500/30 transition-opacity" />
                  </th>
                  <th style={{ width: columnWidths.stockMin }} className="py-3.5 px-4 text-center select-none relative group whitespace-nowrap">
                    {t.tableStockMin}
                    <div onMouseDown={(e) => handleMouseDown('stockMin', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize opacity-0 group-hover:opacity-100 hover:bg-blue-500/30 transition-opacity" />
                  </th>
                  <th style={{ width: columnWidths.cost }} className="py-3.5 px-4 text-right select-none relative group whitespace-nowrap">
                    {t.tableCost}
                    <div onMouseDown={(e) => handleMouseDown('cost', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize opacity-0 group-hover:opacity-100 hover:bg-blue-500/30 transition-opacity" />
                  </th>
                  <th style={{ width: columnWidths.price }} className="py-3.5 px-4 text-right select-none relative group whitespace-nowrap">
                    {t.tablePrice}
                    <div onMouseDown={(e) => handleMouseDown('price', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize opacity-0 group-hover:opacity-100 hover:bg-blue-500/30 transition-opacity" />
                  </th>
                  <th style={{ width: columnWidths.actions }} className="py-3.5 px-4 text-center select-none relative group whitespace-nowrap">
                    {t.tableActions}
                    <div onMouseDown={(e) => handleMouseDown('actions', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize opacity-0 group-hover:opacity-100 hover:bg-blue-500/30 transition-opacity" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {item.foto_url ? (
                        <img src={item.foto_url} alt={item.nombre} className="w-8 h-8 rounded-lg object-cover mx-auto border border-slate-200 shadow-2xs" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center mx-auto border border-slate-200">
                          {item.tipo === 'servicio' ? (
                            <Scissors className="w-4 h-4 text-purple-500" />
                          ) : item.tipo === 'kit' ? (
                            <Gift className="w-4 h-4 text-blue-500" />
                          ) : (
                            <Package className="w-4 h-4 text-emerald-500" />
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span>{item.nombre}</span>
                        {item.comisionable !== false ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200/80" title="Genera comisión al barbero">
                            % Comisión
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-400 border border-slate-200" title="Sin comisión">
                            Sin comisión
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border whitespace-nowrap shadow-2xs ${
                        item.tipo === 'producto' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' 
                          : item.tipo === 'servicio'
                          ? 'bg-purple-50 text-purple-700 border-purple-200/80'
                          : 'bg-blue-50 text-blue-700 border-blue-200/80'
                      }`}>
                        {item.tipo === 'producto' ? t.filterProduct : item.tipo === 'servicio' ? t.filterService : t.filterKit}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-slate-700 whitespace-nowrap">
                      {item.tipo === 'producto' && item.inventariable !== false ? (item.stock_inicial ?? 0) : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {item.tipo === 'servicio' || item.inventariable === false ? (
                        <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold whitespace-nowrap bg-slate-100/90 text-slate-700 border border-slate-200 shadow-2xs">
                          <span className="text-xs font-black">∞</span>
                          <span>{lang === 'es' ? 'No inventariable' : 'Non-inventoriable'}</span>
                        </span>
                      ) : (
                        (() => {
                          const stock = item.tipo === 'kit' 
                            ? (item.vista_stock_kits?.[0]?.stock_calculado ?? item.vista_stock_kits?.stock_calculado ?? 0)
                            : item.stock_actual;
                          const isLow = item.stock_minimo !== undefined && stock <= item.stock_minimo;
                          return (
                            <div className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap">
                              <span className={`font-mono font-bold ${isLow ? 'text-rose-600 font-extrabold' : 'text-slate-900'}`}>
                                {stock}
                              </span>
                              {isLow && (
                                <span className="text-[8px] font-extrabold text-rose-600 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded uppercase tracking-wider whitespace-nowrap">
                                  {lang === 'es' ? 'Bajo' : 'Low'}
                                </span>
                              )}
                            </div>
                          );
                        })()
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-slate-700 whitespace-nowrap">
                      {item.tipo === 'producto' && item.inventariable !== false ? (item.stock_minimo ?? 0) : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-700 whitespace-nowrap">
                      {item.tipo === 'producto' && item.inventariable !== false ? formatMoney(item.precio_costo ?? 0, item.moneda || undefined) : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 whitespace-nowrap">
                      {formatMoney(item.precio_venta, item.moneda || undefined)}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleEditItem(item)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                          title={lang === 'es' ? 'Editar' : 'Edit'}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title={lang === 'es' ? 'Eliminar' : 'Delete'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="bg-slate-50/50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>{lang === 'es' ? 'Anterior' : 'Previous'}</span>
            </button>
            <span className="text-xs text-slate-500 font-medium">
              {lang === 'es' ? `Página ${currentPage} de ${totalPages}` : `Page ${currentPage} of ${totalPages}`}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <span>{lang === 'es' ? 'Siguiente' : 'Next'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Slide-Over Drawer Panel rendered via Portal directly on document.body */}
      {showAddModal && createPortal(
        <>
          {/* Drawer Backdrop Overlay */}
          <div 
            onClick={() => { setShowAddModal(false); resetForm(); }}
            className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          />

          {/* Slide-Over Drawer Panel */}
          <div className="fixed inset-y-0 right-0 z-[100] w-full sm:max-w-xl bg-white shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300 border-l border-slate-200 h-screen">
            
            {/* Panel Header */}
            <div className="px-6 py-4 pt-[max(1rem,env(safe-area-inset-top))] border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-2xs">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-950 leading-tight">
                    {editingItemId ? t.modalTitleEdit : t.modalTitle}
                  </h2>
                  <p className="text-xs text-slate-400 font-medium">
                    {lang === 'es' ? 'Configura los detalles, precios y comisión del item' : 'Configure item details, pricing, and commission'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowAddModal(false); resetForm(); }}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-slate-50/50">
              
              {formError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl text-xs flex items-center gap-2 shadow-sm">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form id="item-form" onSubmit={handleSaveItem} className="space-y-6">
                
                {/* Section 1: Main Information */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                    <Package className="w-3.5 h-3.5 text-blue-600" />
                    <span>{lang === 'es' ? 'Información Principal' : 'Main Information'}</span>
                  </h3>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 block">
                      {t.modalName} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Corte Degradado, Champú Barber, Combo Afeitado"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all text-xs font-medium shadow-2xs placeholder:text-slate-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 block">
                        {t.modalType}
                      </label>
                      <select
                        value={tipo}
                        onChange={(e) => {
                          const newTipo = e.target.value as any;
                          setTipo(newTipo);
                          setKitComponents([]);
                          if (newTipo === 'servicio') setInventariable(false);
                          else if (newTipo === 'kit') setInventariable(false);
                          else setInventariable(true);
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 focus:outline-none focus:border-blue-500 transition-all text-xs shadow-2xs cursor-pointer font-semibold"
                      >
                        <option value="producto">{t.filterProduct}</option>
                        <option value="servicio">{t.filterService}</option>
                        <option value="kit">{t.filterKit}</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 block">
                        {t.modalFoto}
                      </label>
                      <input
                        type="text"
                        placeholder="https://..."
                        value={fotoUrl}
                        onChange={(e) => setFotoUrl(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 transition-all text-xs shadow-2xs placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Pricing & Currency */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                    <Coins className="w-3.5 h-3.5 text-blue-600" />
                    <span>{lang === 'es' ? 'Precios y Moneda' : 'Pricing & Currency'}</span>
                  </h3>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 block">
                        {lang === 'es' ? 'Moneda' : 'Currency'}
                      </label>
                      <select
                        value={itemMoneda}
                        onChange={(e) => setItemMoneda(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 focus:outline-none focus:border-blue-500 transition-all text-xs shadow-2xs cursor-pointer font-bold"
                      >
                        <option value="S/.">S/. (PEN)</option>
                        <option value="$">$ (USD)</option>
                        <option value="€">€ (EUR)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 block">
                        {t.modalPrice} <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="15.00"
                        value={precioVenta}
                        onChange={(e) => setPrecioVenta(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500 transition-all text-xs font-mono font-extrabold shadow-2xs"
                      />
                    </div>

                    {tipo === 'producto' && (
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600 block">
                          {t.modalCost}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="5.00"
                          value={precioCosto}
                          onChange={(e) => setPrecioCosto(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 transition-all text-xs font-mono font-semibold shadow-2xs"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 3: Rules & Toggles (Inventariable & Comisionar) */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                    <Sliders className="w-3.5 h-3.5 text-blue-600" />
                    <span>{lang === 'es' ? 'Reglas de Negocio' : 'Business Rules'}</span>
                  </h3>

                  <div className="space-y-3">
                    {/* Toggle 1: Inventariable (Only for producto and kit) */}
                    {(tipo === 'producto' || tipo === 'kit') && (
                      <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 transition-all">
                        <div className="space-y-0.5 max-w-[78%]">
                          <div className="flex items-center gap-2">
                            <Boxes className="w-4 h-4 text-slate-600 shrink-0" />
                            <span className="text-xs font-bold text-slate-800">
                              {tipo === 'kit'
                                ? (lang === 'es' ? 'Control de Stock por Componentes' : 'Track Stock by Components')
                                : (lang === 'es' ? 'Item Inventariable' : 'Track Inventory')
                              }
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-tight">
                            {tipo === 'kit'
                              ? (inventariable
                                  ? (lang === 'es' ? 'Calcula disponibilidad en base al stock de productos contenidos.' : 'Calculates availability based on component product stock.')
                                  : (lang === 'es' ? 'Venta libre sin restricción de inventario en POS.' : 'Unlimited POS sales without inventory restrictions.'))
                              : (inventariable
                                  ? (lang === 'es' ? 'Mantiene registro de existencias y alertas de stock mínimo.' : 'Tracks physical warehouse quantity and low stock alerts.')
                                  : (lang === 'es' ? 'Producto sin control físico de existencias.' : 'Non-inventoriable physical item.'))
                            }
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            checked={inventariable}
                            onChange={(e) => setInventariable(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    )}

                    {/* Toggle 2: Comisionar al Barbero / Personal */}
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 transition-all">
                      <div className="space-y-0.5 max-w-[78%]">
                        <div className="flex items-center gap-2">
                          <Percent className="w-4 h-4 text-blue-600 shrink-0" />
                          <span className="text-xs font-bold text-slate-800">
                            {lang === 'es' ? 'Comisionar a Personal / Barbero' : 'Commissionable Item'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-tight">
                          {comisionable
                            ? (lang === 'es' ? 'Al vender este item, se aplicará el % de comisión al barbero asignado.' : 'Sales of this item will generate commission for the assigned staff member.')
                            : (lang === 'es' ? 'Item excluido de comisiones (No acumula comisión en ventas).' : 'Excluded from staff commissions (Generates $0 commission).')
                          }
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={comisionable}
                          onChange={(e) => setComisionable(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Section 4: Stock Details (Product + Inventariable) */}
                {tipo === 'producto' && inventariable && (
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-4 animate-in fade-in duration-200">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                      <Boxes className="w-3.5 h-3.5 text-blue-600" />
                      <span>{lang === 'es' ? 'Control de Stock en Almacén' : 'Warehouse Stock Details'}</span>
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600 block">
                          {t.modalStock} <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          required
                          placeholder="10"
                          value={stockActual}
                          onChange={(e) => setStockActual(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500 transition-all text-xs font-mono font-bold shadow-2xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600 block">
                          {t.modalStockMin} <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          required
                          placeholder="2"
                          value={stockMinimo}
                          onChange={(e) => setStockMinimo(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500 transition-all text-xs font-mono font-bold shadow-2xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Section 5: Kit Components */}
                {tipo === 'kit' && (
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-4 animate-in fade-in duration-200">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <Gift className="w-3.5 h-3.5 text-blue-600" />
                        <span>{t.modalKitComponents}</span>
                      </h3>
                      <button
                        type="button"
                        onClick={handleAddComponent}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{t.modalAddComponent}</span>
                      </button>
                    </div>

                    {kitComponents.length === 0 ? (
                      <p className="text-xs text-slate-400 italic text-center py-3">
                        {lang === 'es' ? 'No hay productos asignados a este combo. Haz clic en "Agregar Producto al Kit".' : 'No components assigned. Click "Add Product to Kit".'}
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {kitComponents.map((comp, idx) => (
                          <div key={idx} className="flex gap-3 items-center bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-2xs">
                            <div className="flex-1 space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase block">
                                {t.modalComponentLabel}
                              </label>
                              <select
                                value={comp.componente_hijo_id}
                                onChange={(e) => handleComponentChange(idx, 'componente_hijo_id', e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-none focus:border-blue-500 shadow-2xs font-medium"
                              >
                                {productsList.map((prod) => (
                                  <option key={prod.id} value={prod.id}>{prod.nombre}</option>
                                ))}
                              </select>
                            </div>

                            <div className="w-24 space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase block text-center">
                                {t.modalQuantityLabel}
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={comp.cantidad_requerida}
                                onChange={(e) => handleComponentChange(idx, 'cantidad_requerida', parseInt(e.target.value) || 1)}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs text-center font-mono font-bold shadow-2xs"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveComponent(idx)}
                              className="p-2 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors mt-4"
                              title={lang === 'es' ? 'Quitar componente' : 'Remove component'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </form>
            </div>

            {/* Sticky Panel Footer */}
            <div className="px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-slate-100 bg-white flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => { setShowAddModal(false); resetForm(); }}
                className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                form="item-form"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{t.save}</span>
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};
