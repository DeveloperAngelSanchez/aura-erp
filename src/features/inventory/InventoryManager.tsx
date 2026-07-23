import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useResizableColumns } from '../../hooks/useResizableColumns';

type InvCol = 'name' | 'stock' | 'minStock' | 'cost' | 'value' | 'status';

const initialInvColWidths: Record<InvCol, number> = {
  name: 260,
  stock: 120,
  minStock: 120,
  cost: 140,
  value: 150,
  status: 140,
};
import { supabase } from '../../api/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useSettings } from '../../context/SettingsContext';
import { useEmpresa } from '../../context/EmpresaContext';
import {
  Package,
  AlertTriangle,
  CheckCircle2,
  X,
  ArrowDownCircle,
  ArrowUpCircle,
  History,
  Boxes,
  TrendingDown,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Search,
  ClipboardList,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────
interface InventoryItem {
  id: string;
  nombre: string;
  tipo: 'producto' | 'servicio' | 'kit';
  stock_actual: number;
  stock_minimo: number;
  precio_costo: number;
  precio_venta: number;
  foto_url?: string | null;
  moneda?: string | null;
}

interface MovementRecord {
  id: string;
  item_id: string;
  tipo_movimiento: 'entrada' | 'salida';
  cantidad: number;
  motivo: string;
  nota: string | null;
  stock_anterior: number;
  stock_nuevo: number;
  creado_en: string;
  usuario_id: string;
  items?: { nombre: string } | null;
  perfiles?: { nombre: string } | null;
}

// ─── Translations ──────────────────────────────────────────────────
const translations = {
  es: {
    title: 'Inventario y Logística',
    subtitle: 'Controla el stock, registra movimientos y audita el historial de almacén.',
    tabStock: 'Stock Actual',
    tabHistory: 'Historial / Kardex',
    summaryTotalValue: 'Valor en Almacén',
    summaryTotalProducts: 'Productos en Catálogo',
    summaryLowStock: 'Alertas de Stock Bajo',
    tableName: 'Producto',
    tableStock: 'Stock Actual',
    tableMinStock: 'Stock Mínimo',
    tableCost: 'Precio de Costo',
    tableValue: 'Valor en Almacén',
    tableStatus: 'Estado',
    statusOk: 'Normal',
    statusLow: 'Bajo',
    statusOut: 'Agotado',
    registerMovement: 'Registrar Movimiento',
    modalTitle: 'Registrar Movimiento de Inventario',
    modalProduct: 'Producto',
    modalType: 'Tipo',
    modalTypeIn: 'Entrada',
    modalTypeOut: 'Salida',
    modalQty: 'Cantidad',
    modalReason: 'Motivo',
    modalNote: 'Nota (opcional)',
    reasonPurchase: 'Compra',
    reasonSale: 'Venta',
    reasonAdjust: 'Ajuste Manual',
    reasonLoss: 'Pérdida',
    reasonReturn: 'Devolución',
    cancel: 'Cancelar',
    confirm: 'Confirmar Movimiento',
    movementSuccess: '¡Movimiento registrado con éxito!',
    loading: 'Cargando...',
    noProducts: 'No hay productos de tipo físico en el catálogo.',
    noMovements: 'No se han registrado movimientos de inventario.',
    searchPlaceholder: 'Buscar producto...',
    histDate: 'Fecha',
    histProduct: 'Producto',
    histType: 'Tipo',
    histQty: 'Cantidad',
    histReason: 'Motivo',
    histNote: 'Nota',
    histBefore: 'Stock Ant.',
    histAfter: 'Stock Nuevo',
    histUser: 'Usuario',
    validationProduct: 'Selecciona un producto.',
    validationQty: 'La cantidad debe ser mayor a 0.',
    validationInsufficient: 'Stock insuficiente para esta salida.',
  },
  en: {
    title: 'Inventory & Logistics',
    subtitle: 'Control stock, register movements, and audit warehouse history.',
    tabStock: 'Current Stock',
    tabHistory: 'History / Kardex',
    summaryTotalValue: 'Warehouse Value',
    summaryTotalProducts: 'Products in Catalog',
    summaryLowStock: 'Low Stock Alerts',
    tableName: 'Product',
    tableStock: 'Current Stock',
    tableMinStock: 'Min Stock',
    tableCost: 'Cost Price',
    tableValue: 'Warehouse Value',
    tableStatus: 'Status',
    statusOk: 'Normal',
    statusLow: 'Low',
    statusOut: 'Out',
    registerMovement: 'Register Movement',
    modalTitle: 'Register Inventory Movement',
    modalProduct: 'Product',
    modalType: 'Type',
    modalTypeIn: 'Entry',
    modalTypeOut: 'Exit',
    modalQty: 'Quantity',
    modalReason: 'Reason',
    modalNote: 'Note (optional)',
    reasonPurchase: 'Purchase',
    reasonSale: 'Sale',
    reasonAdjust: 'Manual Adjustment',
    reasonLoss: 'Loss',
    reasonReturn: 'Return',
    cancel: 'Cancel',
    confirm: 'Confirm Movement',
    movementSuccess: 'Movement registered successfully!',
    loading: 'Loading...',
    noProducts: 'No physical products in the catalog.',
    noMovements: 'No inventory movements have been recorded.',
    searchPlaceholder: 'Search product...',
    histDate: 'Date',
    histProduct: 'Product',
    histType: 'Type',
    histQty: 'Quantity',
    histReason: 'Reason',
    histNote: 'Note',
    histBefore: 'Stock Before',
    histAfter: 'Stock After',
    histUser: 'User',
    validationProduct: 'Select a product.',
    validationQty: 'Quantity must be greater than 0.',
    validationInsufficient: 'Insufficient stock for this exit.',
  },
};

// ─── Helpers ───────────────────────────────────────────────────────
const reasonLabels: Record<string, Record<string, string>> = {
  compra: { es: 'Compra', en: 'Purchase' },
  venta: { es: 'Venta', en: 'Sale' },
  ajuste_manual: { es: 'Ajuste Manual', en: 'Manual Adjust' },
  perdida: { es: 'Pérdida', en: 'Loss' },
  devolucion: { es: 'Devolución', en: 'Return' },
  inicial: { es: 'Inventario Inicial', en: 'Initial Stock' },
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

// ─── Component ─────────────────────────────────────────────────────
export const InventoryManager: React.FC = () => {
  const { profile } = useAuth();
  const { lang } = useLanguage();
  const { formatMoney } = useSettings();
  const { impersonating, activeBranchIds } = useEmpresa();
  const t = translations[lang];
  const { columnWidths: invColWidths, handleMouseDown: handleInvMouseDown } = useResizableColumns<InvCol>(initialInvColWidths, 'col_widths_inventory');

  const [activeTab, setActiveTab] = useState<'stock' | 'history'>('stock');
  const [products, setProducts] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<MovementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Stock tab
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  // Movement modal
  const [showModal, setShowModal] = useState(false);
  const [movItemId, setMovItemId] = useState('');
  const [movType, setMovType] = useState<'entrada' | 'salida'>('entrada');
  const [movQty, setMovQty] = useState('');
  const [movReason, setMovReason] = useState('compra');
  const [movNote, setMovNote] = useState('');
  const [movError, setMovError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // ─── Data Loading ────────────────────────────────────────────────
  const loadProducts = async () => {
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('items')
        .select('id, nombre, tipo, stock_actual, stock_minimo, precio_costo, precio_venta, foto_url, moneda')
        .eq('tipo', 'producto')
        .in('sucursal_id', impersonating ? activeBranchIds : [profile?.sucursal_id])
        .order('nombre');
      if (err) throw err;
      setProducts(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMovements = async () => {
    try {
      const { data, error: err } = await supabase
        .from('inventario_movimientos')
        .select('*, items(nombre), perfiles(nombre)')
        .in('sucursal_id', impersonating ? activeBranchIds : [profile?.sucursal_id])
        .order('creado_en', { ascending: false })
        .limit(200);
      if (err) throw err;
      setMovements((data as any) || []);
    } catch (err: any) {
      console.error('Error loading movements:', err);
    }
  };

  useEffect(() => {
    loadProducts();
    loadMovements();

    // Realtime subscriptions: auto-reload on DB changes
    const itemsChannel = supabase
      .channel('inventory-items-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => {
        loadProducts();
      })
      .subscribe();

    const movChannel = supabase
      .channel('inventory-movimientos-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventario_movimientos' }, () => {
        loadMovements();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(itemsChannel);
      supabase.removeChannel(movChannel);
    };
  }, []);

  // ─── Movement Submission ─────────────────────────────────────────
  const handleSubmitMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    setMovError(null);

    if (!movItemId) { setMovError(t.validationProduct); return; }
    const qty = parseFloat(movQty);
    if (isNaN(qty) || qty <= 0) { setMovError(t.validationQty); return; }

    const product = products.find(p => p.id === movItemId);
    if (!product) return;

    if (movType === 'salida' && qty > product.stock_actual) {
      setMovError(t.validationInsufficient);
      return;
    }

    setProcessing(true);
    const stockAnterior = product.stock_actual;
    const stockNuevo = movType === 'entrada'
      ? stockAnterior + qty
      : stockAnterior - qty;

    try {
      // 1. Insert movement record
      const targetBranchId = impersonating && activeBranchIds.length > 0 ? activeBranchIds[0] : profile?.sucursal_id;
      const { error: movErr } = await supabase
        .from('inventario_movimientos')
        .insert({
          item_id: movItemId,
          tipo_movimiento: movType,
          cantidad: qty,
          motivo: movReason,
          nota: movNote.trim() || null,
          stock_anterior: stockAnterior,
          stock_nuevo: stockNuevo,
          usuario_id: profile?.id,
          sucursal_id: targetBranchId,
        });
      if (movErr) throw movErr;

      // 2. Update the product stock
      const { error: updErr } = await supabase
        .from('items')
        .update({ stock_actual: stockNuevo })
        .eq('id', movItemId);
      if (updErr) throw updErr;

      setSuccess(t.movementSuccess);
      setShowModal(false);
      setMovItemId('');
      setMovQty('');
      setMovNote('');
      setMovReason('compra');
      setMovType('entrada');
      loadProducts();
      loadMovements();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setMovError(err.message || 'Error');
    } finally {
      setProcessing(false);
    }
  };

  // ─── Computations ────────────────────────────────────────────────
  const totalValue = products.reduce((sum, p) => sum + (p.stock_actual * (p.precio_costo || 0)), 0);
  const lowStockCount = products.filter(p => p.stock_actual <= (p.stock_minimo || 0)).length;

  const filtered = products.filter(p => p.nombre.toLowerCase().includes(searchTerm.toLowerCase()));
  const totalPages = Math.ceil(filtered.length / perPage);
  const pageItems = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
            <span>{lang === 'es' ? 'Inventario' : 'Inventory'}</span>
            <span>/</span>
            <span className="text-slate-600 font-semibold">{lang === 'es' ? 'Vista General' : 'Overview'}</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight mt-1">{t.title}</h1>
          <p className="text-sm text-slate-500 mt-1">{t.subtitle}</p>
        </div>
        <button
          onClick={() => {
            setMovItemId(products[0]?.id || '');
            setMovType('entrada');
            setMovQty('');
            setMovReason('compra');
            setMovNote('');
            setMovError(null);
            setShowModal(true);
          }}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-500/10 transition-all flex items-center gap-2 cursor-pointer"
        >
          <ClipboardList className="w-4 h-4" />
          <span>{t.registerMovement}</span>
        </button>
      </div>

      {/* Alerts */}
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-2">
          <div className="flex justify-between items-start">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.summaryTotalValue}</p>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-950 font-mono">{formatMoney(totalValue)}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-2">
          <div className="flex justify-between items-start">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.summaryTotalProducts}</p>
            <Boxes className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-950 font-mono">{products.length}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-2">
          <div className="flex justify-between items-start">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.summaryLowStock}</p>
            <TrendingDown className="w-4 h-4 text-rose-600" />
          </div>
          <p className={`text-2xl font-extrabold font-mono ${lowStockCount > 0 ? 'text-rose-600' : 'text-slate-950'}`}>
            {lowStockCount}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white p-1 border border-slate-200 rounded-xl shadow-sm gap-1 w-fit">
        <button
          onClick={() => setActiveTab('stock')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'stock' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5" />{t.tabStock}</span>
        </button>
        <button
          onClick={() => { setActiveTab('history'); loadMovements(); }}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'history' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span className="flex items-center gap-1.5"><History className="w-3.5 h-3.5" />{t.tabHistory}</span>
        </button>
      </div>

      {/* ─── Stock Tab ───────────────────────────────────────────── */}
      {activeTab === 'stock' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {/* Search */}
          <div className="p-4 border-b border-slate-100">
            <div className="relative w-full md:w-80">
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all text-xs text-slate-800 shadow-sm placeholder:text-slate-400"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            </div>
          </div>

          {loading ? (
            <div className="p-16 text-center text-slate-400">
              <span className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin inline-block mb-3"></span>
              <p className="text-xs">{t.loading}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center text-slate-400 text-xs italic">{t.noProducts}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse table-fixed">
                <thead>
                  <tr className="bg-slate-50/90 text-slate-500 uppercase tracking-wider font-extrabold border-b border-slate-200 select-none">
                    <th style={{ width: invColWidths.name }} className="relative py-3.5 px-4 whitespace-nowrap group">
                      <span>{t.tableName}</span>
                      <div onMouseDown={(e) => handleInvMouseDown('name', e)} className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-blue-500/40 z-10 flex items-center justify-center">
                        <div className="w-0.5 h-3.5 bg-slate-300 group-hover:bg-blue-500 rounded-full" />
                      </div>
                    </th>
                    <th style={{ width: invColWidths.stock }} className="relative py-3.5 px-4 text-center whitespace-nowrap group">
                      <span>{t.tableStock}</span>
                      <div onMouseDown={(e) => handleInvMouseDown('stock', e)} className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-blue-500/40 z-10 flex items-center justify-center">
                        <div className="w-0.5 h-3.5 bg-slate-300 group-hover:bg-blue-500 rounded-full" />
                      </div>
                    </th>
                    <th style={{ width: invColWidths.minStock }} className="relative py-3.5 px-4 text-center whitespace-nowrap group">
                      <span>{t.tableMinStock}</span>
                      <div onMouseDown={(e) => handleInvMouseDown('minStock', e)} className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-blue-500/40 z-10 flex items-center justify-center">
                        <div className="w-0.5 h-3.5 bg-slate-300 group-hover:bg-blue-500 rounded-full" />
                      </div>
                    </th>
                    <th style={{ width: invColWidths.cost }} className="relative py-3.5 px-4 text-right whitespace-nowrap group">
                      <span>{t.tableCost}</span>
                      <div onMouseDown={(e) => handleInvMouseDown('cost', e)} className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-blue-500/40 z-10 flex items-center justify-center">
                        <div className="w-0.5 h-3.5 bg-slate-300 group-hover:bg-blue-500 rounded-full" />
                      </div>
                    </th>
                    <th style={{ width: invColWidths.value }} className="relative py-3.5 px-4 text-right whitespace-nowrap group">
                      <span>{t.tableValue}</span>
                      <div onMouseDown={(e) => handleInvMouseDown('value', e)} className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-blue-500/40 z-10 flex items-center justify-center">
                        <div className="w-0.5 h-3.5 bg-slate-300 group-hover:bg-blue-500 rounded-full" />
                      </div>
                    </th>
                    <th style={{ width: invColWidths.status }} className="relative py-3.5 px-4 text-center whitespace-nowrap group">
                      <span>{t.tableStatus}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pageItems.map((item) => {
                    const isOut = item.stock_actual <= 0;
                    const isLow = !isOut && item.stock_actual <= (item.stock_minimo || 0);
                    const value = item.stock_actual * (item.precio_costo || 0);

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shadow-2xs overflow-hidden flex-shrink-0">
                              {item.foto_url ? (
                                <img src={item.foto_url} alt={item.nombre} className="w-full h-full object-cover" />
                              ) : (
                                <Package className="w-4 h-4 text-emerald-600" />
                              )}
                            </div>
                            <span className="font-bold text-slate-900 truncate">{item.nombre}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-black text-slate-900 whitespace-nowrap">{item.stock_actual}</td>
                        <td className="py-3.5 px-4 text-center font-mono text-slate-500 whitespace-nowrap">{item.stock_minimo || 0}</td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-700 whitespace-nowrap">{formatMoney(item.precio_costo || 0, item.moneda || undefined)}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 whitespace-nowrap">{formatMoney(value, item.moneda || undefined)}</td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {isOut ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border whitespace-nowrap bg-rose-50 text-rose-700 border-rose-200/80 shadow-2xs">
                              {t.statusOut}
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border whitespace-nowrap bg-amber-50 text-amber-700 border-amber-200/80 shadow-2xs">
                              {t.statusLow}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border whitespace-nowrap bg-emerald-50 text-emerald-700 border-emerald-200/80 shadow-2xs">
                              {t.statusOk}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-slate-50/50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-lg text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
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
                className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-lg text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <span>{lang === 'es' ? 'Siguiente' : 'Next'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── History / Kardex Tab ─────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {movements.length === 0 ? (
            <div className="p-16 text-center text-slate-400 text-xs italic">{t.noMovements}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
                    <th className="py-4 px-5">{t.histDate}</th>
                    <th className="py-4 px-5">{t.histProduct}</th>
                    <th className="py-4 px-5 text-center">{t.histType}</th>
                    <th className="py-4 px-5 text-center">{t.histQty}</th>
                    <th className="py-4 px-5">{t.histReason}</th>
                    <th className="py-4 px-5">{t.histNote}</th>
                    <th className="py-4 px-5 text-center">{t.histBefore}</th>
                    <th className="py-4 px-5 text-center">{t.histAfter}</th>
                    <th className="py-4 px-5">{t.histUser}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {movements.map((mov) => (
                    <tr key={mov.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-5 text-slate-600 font-medium whitespace-nowrap">{formatDate(mov.creado_en)}</td>
                      <td className="py-3.5 px-5 font-bold text-slate-900">{(mov.items as any)?.nombre || '—'}</td>
                      <td className="py-3.5 px-5 text-center">
                        {mov.tipo_movimiento === 'entrada' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-emerald-50 text-emerald-700 border-emerald-100">
                            <ArrowDownCircle className="w-3 h-3" />
                            {t.modalTypeIn}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-rose-50 text-rose-700 border-rose-100">
                            <ArrowUpCircle className="w-3 h-3" />
                            {t.modalTypeOut}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-center font-mono font-bold text-slate-900">{mov.cantidad}</td>
                      <td className="py-3.5 px-5 text-slate-700 font-medium capitalize">
                        {reasonLabels[mov.motivo]?.[lang] || mov.motivo}
                      </td>
                      <td className="py-3.5 px-5 text-slate-500 max-w-[150px] truncate" title={mov.nota || ''}>
                        {mov.nota || '—'}
                      </td>
                      <td className="py-3.5 px-5 text-center font-mono text-slate-500">{mov.stock_anterior}</td>
                      <td className="py-3.5 px-5 text-center font-mono font-bold text-slate-900">{mov.stock_nuevo}</td>
                      <td className="py-3.5 px-5 text-slate-700 font-medium">{(mov.perfiles as any)?.nombre || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── Movement Registration Modal ─────────────────────────── */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-xl p-6 overflow-y-auto max-h-[90vh] space-y-5 text-slate-800 animate-in fade-in zoom-in duration-205">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-950">{t.modalTitle}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {movError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs flex items-center gap-2 shadow-sm">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>{movError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitMovement} className="space-y-4">
              {/* Product */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t.modalProduct}</label>
                <select
                  value={movItemId}
                  onChange={(e) => setMovItemId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 focus:outline-none focus:border-blue-500 transition-all text-xs shadow-sm cursor-pointer"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre} (Stock: {p.stock_actual})</option>
                  ))}
                </select>
              </div>

              {/* Type + Quantity */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t.modalType}</label>
                  <select
                    value={movType}
                    onChange={(e) => setMovType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 focus:outline-none focus:border-blue-500 transition-all text-xs shadow-sm cursor-pointer font-bold"
                  >
                    <option value="entrada">{t.modalTypeIn}</option>
                    <option value="salida">{t.modalTypeOut}</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t.modalQty}</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    placeholder="10"
                    value={movQty}
                    onChange={(e) => setMovQty(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 transition-all text-xs font-mono font-semibold shadow-sm"
                  />
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t.modalReason}</label>
                <select
                  value={movReason}
                  onChange={(e) => setMovReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 focus:outline-none focus:border-blue-500 transition-all text-xs shadow-sm cursor-pointer"
                >
                  <option value="compra">{t.reasonPurchase}</option>
                  <option value="ajuste_manual">{t.reasonAdjust}</option>
                  <option value="perdida">{t.reasonLoss}</option>
                  <option value="devolucion">{t.reasonReturn}</option>
                </select>
              </div>

              {/* Note */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t.modalNote}</label>
                <input
                  type="text"
                  placeholder={lang === 'es' ? 'Ej: Compra de reposición del proveedor X' : 'E.g.: Restock purchase from supplier X'}
                  value={movNote}
                  onChange={(e) => setMovNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 transition-all text-xs shadow-sm placeholder:text-slate-400"
                />
              </div>

              {/* Preview */}
              {movItemId && movQty && parseFloat(movQty) > 0 && (() => {
                const product = products.find(p => p.id === movItemId);
                if (!product) return null;
                const qty = parseFloat(movQty);
                const newStock = movType === 'entrada' ? product.stock_actual + qty : product.stock_actual - qty;
                return (
                  <div className={`p-3 rounded-xl text-xs font-bold flex justify-between items-center border shadow-sm ${
                    newStock < 0
                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                      : movType === 'entrada'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}>
                    <span>{product.nombre}</span>
                    <span className="font-mono">{product.stock_actual} → {newStock < 0 ? '⚠️ ' : ''}{newStock}</span>
                  </div>
                );
              })()}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
                >
                  {processing ? (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>{t.confirm}</span>
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
