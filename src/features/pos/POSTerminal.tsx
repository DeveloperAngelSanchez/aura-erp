import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../api/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useCash } from '../../context/CashContext';
import { useEmpresa } from '../../context/EmpresaContext';
import { useSettings } from '../../context/SettingsContext';
import {
  ShoppingCart,
  Lock,
  Unlock,
  Globe,
  LogOut,
  Package,
  AlertCircle,
  X,
  Plus,
  Trash2,
  CheckCircle2,
  DollarSign,
  History,
  User,
  UserPlus,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CartPanel } from './CartPanel';
import type { CartItem } from './CartPanel';
import { CatalogPanel } from './CatalogPanel';
import { CashMovementModal } from './CashMovementModal';
import { SalesHistoryModal } from './SalesHistoryModal';

interface Item {
  id: string;
  nombre: string;
  tipo: 'producto' | 'servicio' | 'kit';
  precio_venta: number;
  stock_actual: number;
  inventariable?: boolean;
  vista_stock_kits?: any;
  item_presentaciones?: { nombre: string; precio_venta: number; stock_actual: number; stock_minimo: number; inventariable: boolean }[];
  moneda?: string | null;
}

interface Attention {
  id: string;
  customerName: string;
  cart: CartItem[];
  barberoId: string;
  createdAt: number;
  clienteNombre: string;
  guardarCliente: boolean;
  clienteExistente?: boolean;
  clienteId?: string;
}

const translations = {
  es: {
    posTitle: 'Terminal de Punto de Venta (POS)',
    drawerClosed: 'Caja Cerrada',
    drawerOpen: 'Caja Abierta',
    openTurnBtn: 'Abrir Turno de Caja',
    closeTurnBtn: 'Cerrar Turno de Caja',
    cashier: 'Cajero',
    baseAmount: 'Monto de Apertura',
    initialBase: 'Fondo de apertura',
    openingSuccess: '¡Caja abierta con éxito!',
    closingSuccess: '¡Caja cerrada y arqueada con éxito!',
    expectedBalance: 'Saldo esperado en caja',
    realBalance: 'Contado físico de efectivo',
    discrepancy: 'Diferencia (Sobrante/Faltante)',
    discrepancyNone: 'Caja Cuadrada Exacta',
    discrepancyDeficit: 'Faltante de caja',
    discrepancySurplus: 'Sobrante de caja',
    searchPlaceholder: 'Buscar item por nombre...',
    categoriesAll: 'Todos',
    categoriesProducts: 'Productos',
    categoriesServices: 'Servicios',
    categoriesKits: 'Combos / Kits',
    cartTitle: 'Detalle de la Venta',
    cartEmpty: 'El carrito de ventas está vacío.',
    subtotal: 'Subtotal',
    total: 'Importe Total',
    paymentMethod: 'Método de Pago',
    cash: 'Efectivo',
    card: 'Tarjeta',
    transfer: 'Transferencia',
    processSale: 'Procesar Venta',
    saleSuccess: '¡Venta procesada con éxito!',
    outOfStock: 'Sin Stock',
    notApplicable: 'Servicio',
    inStock: 'disp.',
    catalogTab: 'Catálogo',
    cartTab: 'Carrito',
    cancel: 'Cancelar',
    confirmClose: 'Confirmar Cierre de Caja',
    confirmOpen: 'Confirmar Apertura',
    logout: 'Cerrar Sesión',
    // Split payments translations
    checkoutTitle: 'Detalle de Pago / Checkout',
    addPayment: 'Añadir Método de Pago',
    remainingAmount: 'Restante por Cobrar',
    totalReceived: 'Monto Recibido',
    confirmSale: 'Confirmar y Finalizar Venta',
    paymentMethodsFav: 'Botones Rápidos (Favoritos)',
    cashMovement: 'Movimiento de Caja',
    salesHistory: 'Historial de Ventas',
    clientePlaceholder: 'Nombre del cliente...',
    guardarCliente: 'Guardar cliente',
  },
  en: {
    posTitle: 'Point of Sale (POS) Terminal',
    drawerClosed: 'Cash Register Closed',
    drawerOpen: 'Cash Register Open',
    openTurnBtn: 'Open Cash Turn',
    closeTurnBtn: 'Close Cash Turn',
    cashier: 'Cashier',
    baseAmount: 'Opening Base Cash',
    initialBase: 'Opening base fund',
    openingSuccess: 'Cash register opened successfully!',
    closingSuccess: 'Cash register closed and reconciled successfully!',
    expectedBalance: 'Expected drawer balance',
    realBalance: 'Physical cash count',
    discrepancy: 'Discrepancy (Surplus/Deficit)',
    discrepancyNone: 'Register Balanced Perfectly',
    discrepancyDeficit: 'Drawer Deficit',
    discrepancySurplus: 'Drawer Surplus',
    searchPlaceholder: 'Search item by name...',
    categoriesAll: 'All',
    categoriesProducts: 'Products',
    categoriesServices: 'Services',
    categoriesKits: 'Combos / Kits',
    cartTitle: 'Order Details',
    cartEmpty: 'The sales cart is empty.',
    subtotal: 'Subtotal',
    total: 'Total Amount',
    paymentMethod: 'Payment Method',
    cash: 'Cash',
    card: 'Card',
    transfer: 'Transfer',
    processSale: 'Process Sale',
    saleSuccess: 'Sale processed successfully!',
    outOfStock: 'Out of Stock',
    notApplicable: 'Service',
    inStock: 'avail.',
    catalogTab: 'Catalog',
    cartTab: 'Cart',
    cancel: 'Cancel',
    confirmClose: 'Confirm Drawer Close',
    confirmOpen: 'Confirm Open',
    logout: 'Log Out',
    // Split payments translations
    checkoutTitle: 'Payment Details / Checkout',
    addPayment: 'Add Payment Method',
    remainingAmount: 'Remaining Balance',
    totalReceived: 'Total Received',
    confirmSale: 'Confirm & Complete Sale',
    paymentMethodsFav: 'Quick Buttons (Favorites)',
    cashMovement: 'Cash Movement',
    salesHistory: 'Sales History',
    clientePlaceholder: 'Customer name...',
    guardarCliente: 'Save customer',
  }
};

export const POSTerminal: React.FC = () => {
  const { profile, signOut } = useAuth();
  const { lang, toggleLanguage } = useLanguage();
  const { activeTurn, openTurn } = useCash();
  const { impersonating, activeBranchIds } = useEmpresa();
  const { formatMoney, config } = useSettings();
  const navigate = useNavigate();
  const t = translations[lang];

  const [items, setItems] = useState<Item[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'producto' | 'servicio' | 'kit'>('all');

  const CART_STORAGE_KEY = 'aura_pos_attentions';

  const [attentions, setAttentions] = useState<Attention[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Attention[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { }
    return [];
  });
  const [activeAttentionId, setActiveAttentionId] = useState<string | null>(null);

  const [successReceiptData, setSuccessReceiptData] = useState<{
    total: number;
    vuelto: number;
    barberoNombre: string;
    clienteNombre: string;
    itemsCount: number;
    pagos: { metodo_pago: string; monto: number }[];
  } | null>(null);

  useEffect(() => {
    try {
      if (attentions.length > 0) {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(attentions));
      } else {
        localStorage.removeItem(CART_STORAGE_KEY);
      }
    } catch { /* localStorage no disponible */ }
  }, [attentions]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === CART_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as Attention[];
          if (Array.isArray(parsed)) {
            setAttentions(parsed);
          }
        } catch { }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Auto-create default Atención 1 on mount if empty
  useEffect(() => {
    if (attentions.length === 0) {
      const defaultAtt: Attention = {
        id: crypto.randomUUID(),
        customerName: 'Atención 1',
        cart: [],
        barberoId: selectedBarberoId,
        createdAt: Date.now(),
        clienteNombre: '',
        guardarCliente: false,
      };
      setAttentions([defaultAtt]);
      setActiveAttentionId(defaultAtt.id);
    }
  }, []);

  useEffect(() => {
    if (!activeAttentionId && attentions.length > 0) {
      setActiveAttentionId(attentions[0].id);
    }
  }, [attentions, activeAttentionId]);

  // Sync attention barbero changes to selectedBarberoId
  const activeAttention = attentions.find(a => a.id === activeAttentionId);
  useEffect(() => {
    if (activeAttention) {
      setSelectedBarberoId(activeAttention.barberoId);
    }
  }, [activeAttention?.id]);

  const getCartKey = (itemId: string, presNombre?: string) => presNombre ? `${itemId}::${presNombre}` : itemId;

  const getActiveCart = (): CartItem[] => activeAttention?.cart || [];
  const getActiveCartTotal = () => getActiveCart().reduce((sum, c) => sum + (c.cantidad * (c.precioUnitario ?? c.item.precio_venta)), 0);

  const updateAttention = (attentionId: string, updates: Partial<Attention>) => {
    setAttentions(prev => prev.map(a => a.id === attentionId ? { ...a, ...updates } : a));
  };

  const getOrCreateAttention = (): Attention => {
    if (activeAttention) return activeAttention;
    const newAttention: Attention = {
      id: crypto.randomUUID(),
      customerName: `Atención ${attentions.length + 1}`,
      cart: [],
      barberoId: selectedBarberoId,
      createdAt: Date.now(),
      clienteNombre: '',
      guardarCliente: false,
    };
    setAttentions(prev => [...prev, newAttention]);
    setActiveAttentionId(newAttention.id);
    return newAttention;
  };

  const handleAddAttention = () => {
    setNewAttClienteNombre('');
    setNewAttGuardarCliente(false);
    setNewAttClienteExistente(false);
    setNewAttClienteId(null);
    setClienteSuggestions([]);
    setShowSuggestions(false);
    setShowNewAttentionModal(true);
  };

  const handleConfirmNewAttention = () => {
    const newAttention: Attention = {
      id: crypto.randomUUID(),
      customerName: newAttClienteNombre.trim() || `Atención ${attentions.length + 1}`,
      cart: [],
      barberoId: selectedBarberoId,
      createdAt: Date.now(),
      clienteNombre: newAttClienteNombre.trim(),
      guardarCliente: newAttClienteExistente ? false : newAttGuardarCliente,
      clienteExistente: newAttClienteExistente,
      clienteId: newAttClienteId || undefined,
    };
    setAttentions(prev => [...prev, newAttention]);
    setActiveAttentionId(newAttention.id);
    setShowNewAttentionModal(false);
  };

  const handleCloseAttention = (attentionId: string) => {
    const attention = attentions.find(a => a.id === attentionId);
    if (attention && attention.cart.length > 0) {
      if (!confirm(
        lang === 'es'
          ? `¿Cerrar atención "${attention.customerName}"? Tiene ${attention.cart.reduce((s, c) => s + c.cantidad, 0)} item(s) sin facturar.`
          : `Close "${attention.customerName}"? It has ${attention.cart.reduce((s, c) => s + c.cantidad, 0)} item(s) not invoiced.`
      )) return;
    }
    const remaining = attentions.filter(a => a.id !== attentionId);
    setAttentions(remaining);
    if (activeAttentionId === attentionId) {
      setActiveAttentionId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleRenameAttention = (attentionId: string, newName: string) => {
    if (!newName.trim()) return;
    updateAttention(attentionId, { customerName: newName.trim() });
  };

  const [barberos, setBarberos] = useState<any[]>([]);
  const [selectedBarberoId, setSelectedBarberoId] = useState<string>('');

  // Sync barbero selection to active attention
  useEffect(() => {
    if (activeAttentionId && selectedBarberoId && activeAttention?.barberoId !== selectedBarberoId) {
      updateAttention(activeAttentionId, { barberoId: selectedBarberoId });
    }
  }, [selectedBarberoId]);

  // New Attention Modal State
  const [showNewAttentionModal, setShowNewAttentionModal] = useState(false);
  const [newAttClienteNombre, setNewAttClienteNombre] = useState('');
  const [newAttGuardarCliente, setNewAttGuardarCliente] = useState(false);
  const [clienteSuggestions, setClienteSuggestions] = useState<{ id: string; nombre: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [newAttClienteExistente, setNewAttClienteExistente] = useState(false);
  const [newAttClienteId, setNewAttClienteId] = useState<string | null>(null);

  // Search clients as user types in new attention modal
  useEffect(() => {
    const term = newAttClienteNombre.trim();
    if (!term || newAttClienteExistente) { setClienteSuggestions([]); setShowSuggestions(false); return; }
    const timer = setTimeout(async () => {
      const branchIds = impersonating ? activeBranchIds : (profile?.sucursal_id ? [profile.sucursal_id] : []);
      let query = supabase
        .from('clientes')
        .select('id, nombre')
        .ilike('nombre', `%${term}%`)
        .limit(10);
      if (branchIds.length > 0) {
        query = query.in('sucursal_id', branchIds);
      }
      const { data, error } = await query;
      if (!error && data) {
        setClienteSuggestions(data);
        setShowSuggestions(data.length > 0);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [newAttClienteNombre, newAttClienteExistente, impersonating, activeBranchIds, profile?.sucursal_id]);

  // Checkout Customer Search State
  const [checkoutClienteSuggestions, setCheckoutClienteSuggestions] = useState<{ id: string; nombre: string }[]>([]);
  const [showCheckoutSuggestions, setShowCheckoutSuggestions] = useState(false);

  useEffect(() => {
    const term = activeAttention?.clienteNombre?.trim() || '';
    if (!term || activeAttention?.clienteExistente) { setCheckoutClienteSuggestions([]); setShowCheckoutSuggestions(false); return; }
    const timer = setTimeout(async () => {
      const branchIds = impersonating ? activeBranchIds : (profile?.sucursal_id ? [profile.sucursal_id] : []);
      let query = supabase
        .from('clientes')
        .select('id, nombre')
        .ilike('nombre', `%${term}%`)
        .limit(10);
      if (branchIds.length > 0) {
        query = query.in('sucursal_id', branchIds);
      }
      const { data, error } = await query;
      if (!error && data) {
        setCheckoutClienteSuggestions(data);
        setShowCheckoutSuggestions(data.length > 0);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [activeAttention?.clienteNombre, activeAttention?.clienteExistente, impersonating, activeBranchIds, profile?.sucursal_id]);

  // Checkout & Split Payments State
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [pagos, setPagos] = useState<{ metodo_pago: string; monto: string }[]>([]);

  const [showOpenModal, setShowOpenModal] = useState(false);
  const [openBaseCash, setOpenBaseCash] = useState('100.00');
  const [openError, setOpenError] = useState<string | null>(null);

  const [processingSale, setProcessingSale] = useState(false);
  const [saleSuccessMessage, setSaleSuccessMessage] = useState<string | null>(null);

  const [showCashMovementModal, setShowCashMovementModal] = useState(false);
  const [showSalesHistoryModal, setShowSalesHistoryModal] = useState(false);

  const [activeMobileTab, setActiveMobileTab] = useState<'catalog' | 'cart'>('catalog');

  const loadBarberos = async () => {
    if (!profile?.sucursal_id) return;
    try {
      const { data, error } = await supabase
        .from('perfiles')
        .select('id, nombre')
        .in('sucursal_id', impersonating ? activeBranchIds : [profile.sucursal_id])
        .eq('rol', 'barbero');

      if (!error && data) {
        setBarberos(data);
        if (data.length > 0) {
          setSelectedBarberoId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading barberos:', err);
    }
  };

  const loadCatalog = async () => {
    try {
      setLoadingCatalog(true);

      const { data: itemsData, error: itemsError } = await supabase
        .from('items')
        .select('*, item_presentaciones(*)')
        .in('sucursal_id', impersonating ? activeBranchIds : [profile?.sucursal_id])
        .order('creado_en', { ascending: false });

      if (itemsError) throw itemsError;

      const { data: kitsStockData, error: kitsError } = await supabase
        .from('vista_stock_kits')
        .select('*');

      if (kitsError) throw kitsError;

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
    } catch (err: any) {
      console.error('Error loading POS catalog:', err);
    } finally {
      setLoadingCatalog(false);
    }
  };

  useEffect(() => {
    if (activeTurn) {
      loadCatalog();
      loadBarberos();
    }
  }, [activeTurn, profile]);

  const handleOpenTurn = async (e: React.FormEvent) => {
    e.preventDefault();
    setOpenError(null);
    const amount = parseFloat(openBaseCash);
    if (isNaN(amount) || amount < 0) {
      setOpenError(lang === 'es' ? 'Ingresa un monto válido >= 0' : 'Enter a valid amount >= 0');
      return;
    }

    try {
      await openTurn(amount);
      setShowOpenModal(false);
    } catch (err: any) {
      setOpenError(err.message || 'Error opening cash turn');
    }
  };

  const addToCart = (item: Item, presentacionNombre?: string) => {
    const attention = getOrCreateAttention();
    const currentCart = attention.cart;
    const cartKey = getCartKey(item.id, presentacionNombre);
    const existing = currentCart.find(c => getCartKey(c.item.id, c.presentacionNombre) === cartKey);
    const currentQty = existing ? existing.cantidad : 0;

    if (presentacionNombre) {
      const pres = item.item_presentaciones?.find(p => p.nombre === presentacionNombre);
      if (pres && pres.inventariable && currentQty >= pres.stock_actual) {
        alert(lang === 'es' ? 'No hay suficiente inventario disponible.' : 'Not enough stock available.');
        return;
      }
    } else if (item.tipo === 'producto' && item.inventariable !== false) {
      if (currentQty >= item.stock_actual) {
        alert(lang === 'es' ? 'No hay suficiente inventario disponible.' : 'Not enough stock available.');
        return;
      }
    } else if (item.tipo === 'kit' && item.inventariable === true) {
      const kitStock = item.vista_stock_kits?.stock_calculado ?? 0;
      if (kitStock > 0 && currentQty >= kitStock) {
        alert(lang === 'es' ? 'No hay suficiente inventario disponible.' : 'Not enough stock available.');
        return;
      }
    }

    let newCart: CartItem[];
    if (existing) {
      newCart = currentCart.map(c => getCartKey(c.item.id, c.presentacionNombre) === cartKey ? { ...c, cantidad: c.cantidad + 1 } : c);
    } else {
      const pres = item.item_presentaciones?.find(p => p.nombre === presentacionNombre);
      newCart = [...currentCart, {
        item,
        cantidad: 1,
        presentacionNombre,
        precioUnitario: pres?.precio_venta,
      }];
    }
    updateAttention(attention.id, { cart: newCart });
  };

  const updateCartQty = (cartKey: string, delta: number) => {
    if (!activeAttention) return;
    const currentCart = activeAttention.cart;
    const existing = currentCart.find(c => getCartKey(c.item.id, c.presentacionNombre) === cartKey);
    if (!existing) return;

    const newQty = existing.cantidad + delta;
    if (newQty <= 0) {
      updateAttention(activeAttention.id, { cart: currentCart.filter(c => getCartKey(c.item.id, c.presentacionNombre) !== cartKey) });
      return;
    }

    if (delta > 0) {
      if (existing.presentacionNombre) {
        const pres = existing.item.item_presentaciones?.find(p => p.nombre === existing.presentacionNombre);
        if (pres && pres.inventariable && newQty > pres.stock_actual) {
          alert(lang === 'es' ? 'No hay suficiente inventario disponible.' : 'Not enough stock available.');
          return;
        }
      } else if (existing.item.tipo === 'producto' && existing.item.inventariable !== false) {
        if (newQty > existing.item.stock_actual) {
          alert(lang === 'es' ? 'No hay suficiente inventario disponible.' : 'Not enough stock available.');
          return;
        }
      } else if (existing.item.tipo === 'kit' && existing.item.inventariable === true) {
        const kitStock = existing.item.vista_stock_kits?.[0]?.stock_calculado ?? existing.item.vista_stock_kits?.stock_calculado ?? 0;
        if (kitStock > 0 && newQty > kitStock) {
          alert(lang === 'es' ? 'No hay suficiente inventario disponible.' : 'Not enough stock available.');
          return;
        }
      }
    }

    updateAttention(activeAttention.id, { cart: currentCart.map(c => getCartKey(c.item.id, c.presentacionNombre) === cartKey ? { ...c, cantidad: newQty } : c) });
  };

  const removeFromCart = (cartKey: string) => {
    if (!activeAttention) return;
    updateAttention(activeAttention.id, { cart: activeAttention.cart.filter(c => getCartKey(c.item.id, c.presentacionNombre) !== cartKey) });
  };

  const getCartTotal = () => getActiveCartTotal();

  const handleCheckout = () => {
    const activeCart = getActiveCart();
    if (activeCart.length === 0 || !activeTurn) return;
    const total = getActiveCartTotal();

    const defaultMethod = config?.metodos_pago_favoritos?.[0] || 'efectivo';
    setPagos([{ metodo_pago: defaultMethod, monto: total.toString() }]);
    setShowCheckoutModal(true);
  };

  const submitCheckout = async () => {
    const activeCart = getActiveCart();
    if (activeCart.length === 0 || !activeTurn || !activeAttention) return;

    const totalVenta = getCartTotal();
    const totalIngresado = pagos.reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0);
    const vuelto = Math.max(0, totalIngresado - totalVenta);

    // Validar que se haya cubierto la venta
    if (totalIngresado < totalVenta) {
      alert(lang === 'es' ? 'Falta cubrir el saldo total de la venta.' : 'Remaining balance must be covered.');
      return;
    }

    // Validar que todos los pagos tengan un método seleccionado
    if (pagos.some(p => p.metodo_pago === '')) {
      alert(lang === 'es' ? 'Por favor, selecciona un método de pago para cada línea.' : 'Please select a payment method for each line.');
      return;
    }

    // Validar que si no hay efectivo, el pago recibido sea exacto
    const tieneEfectivo = pagos.some(p => p.metodo_pago === 'efectivo');
    if (vuelto > 0.01 && !tieneEfectivo) {
      alert(lang === 'es' ? 'El cobro con tarjeta o transferencia debe ser exacto. No se permite generar vuelto sin efectivo.' : 'Card or transfer payment must be exact. Change cannot be generated without cash.');
      return;
    }

    setProcessingSale(true);
    setSaleSuccessMessage(null);

    const saleItems = activeCart.map(c => ({
      item_id: c.item.id,
      cantidad: c.cantidad,
      precio_unitario: c.precioUnitario ?? c.item.precio_venta,
      presentacion_nombre: c.presentacionNombre || null,
    }));

    // Formatear pagos para la RPC deduciendo el vuelto de la línea de efectivo
    let vueltoRestante = vuelto;
    const salePagos = pagos.map(p => {
      let monto = parseFloat(p.monto) || 0;
      if (p.metodo_pago === 'efectivo' && vueltoRestante > 0) {
        const deduccion = Math.min(monto, vueltoRestante);
        monto -= deduccion;
        vueltoRestante -= deduccion;
      }
      return {
        metodo_pago: p.metodo_pago,
        monto: parseFloat(monto.toFixed(2))
      };
    }).filter(p => p.monto > 0.005); // Excluir líneas que quedaron en 0

    // Si por una extraña razón no queda ningún pago, agregar una línea por defecto
    if (salePagos.length === 0) {
      salePagos.push({ metodo_pago: 'efectivo', monto: 0 });
    }

    try {
      const targetBranchId = impersonating && activeBranchIds.length > 0 ? activeBranchIds[0] : profile?.sucursal_id;

      let clienteId: string | null = activeAttention.clienteId || null;
      if (!clienteId && activeAttention.clienteNombre.trim()) {
        if (activeAttention.guardarCliente) {
          const { data: cid, error: cErr } = await supabase.rpc('buscar_o_crear_cliente', {
            p_nombre: activeAttention.clienteNombre.trim(),
            p_sucursal_id: targetBranchId,
          });
          if (!cErr && cid) clienteId = cid;
        } else {
          // Look up if client already exists by name
          const branchIds = impersonating ? activeBranchIds : (profile?.sucursal_id ? [profile.sucursal_id] : []);
          let query = supabase.from('clientes').select('id').ilike('nombre', activeAttention.clienteNombre.trim()).limit(1);
          if (branchIds.length > 0) {
            query = query.in('sucursal_id', branchIds);
          }
          const { data: existingClient } = await query;
          if (existingClient && existingClient.length > 0) {
            clienteId = existingClient[0].id;
          }
        }
      }

      const { error } = await supabase.rpc('procesar_venta_pos', {
        p_sucursal_id: targetBranchId,
        p_turno_id: activeTurn.id,
        p_usuario_id: profile?.id,
        p_total: totalVenta,
        p_items: saleItems,
        p_pagos: salePagos,
        p_barbero_id: selectedBarberoId || null,
        p_cliente_id: clienteId,
        p_cliente_nombre: activeAttention.clienteNombre.trim() || null,
      });

      if (error) throw error;

      const barberoObj = barberos.find(b => b.id === selectedBarberoId);
      const barberoNombre = barberoObj ? barberoObj.nombre : (lang === 'es' ? 'Atención General' : 'General Staff');
      const clienteNombre = activeAttention.clienteNombre.trim() || (lang === 'es' ? 'Cliente General' : 'General Customer');
      const itemsCount = activeCart.reduce((sum, c) => sum + c.cantidad, 0);

      setSuccessReceiptData({
        total: totalVenta,
        vuelto,
        barberoNombre,
        clienteNombre,
        itemsCount,
        pagos: salePagos,
      });

      // Remove the completed attention
      const remaining = attentions.filter(a => a.id !== activeAttention!.id);
      setAttentions(remaining);
      if (remaining.length > 0) {
        setActiveAttentionId(remaining[0].id);
      } else {
        setActiveAttentionId(null);
      }
      setShowCheckoutModal(false);
      loadCatalog();
    } catch (err: any) {
      console.error('Error processing POS transaction:', err);
      alert(err.message || 'Error processing transaction');
    } finally {
      setProcessingSale(false);
    }
  };

  const filteredCatalog = items.filter(item => {
    const matchesSearch = item.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.tipo === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getStockLabel = (item: Item) => {
    if (item.tipo === 'servicio') return lang === 'es' ? 'Servicio' : 'Service';
    if (item.tipo === 'kit') {
      if (item.inventariable === true && (item.vista_stock_kits?.stock_calculado ?? 0) > 0) {
        return `${item.vista_stock_kits.stock_calculado} ${t.inStock}`;
      }
      return lang === 'es' ? 'Combo / Kit' : 'Combo / Kit';
    }
    if (item.inventariable === false) return lang === 'es' ? 'Ilimitado' : 'Unlimited';

    const stock = item.stock_actual;
    return stock > 0 ? `${stock} ${t.inStock}` : t.outOfStock;
  };

  return (
    <div className="h-dvh bg-slate-50 text-slate-800 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm z-30">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Aura" className="w-8 h-8 object-contain rounded-lg" />
          <div>
            <h1 className="font-extrabold text-base text-slate-900 tracking-tight">{t.posTitle}</h1>
            {activeTurn && (
              <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{t.drawerOpen} | {t.cashier}: {profile?.nombre}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={toggleLanguage}
            className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 bg-white cursor-pointer">
            <Globe className="w-3.5 h-3.5" />
            <span>{lang === 'es' ? 'ES' : 'EN'}</span>
          </button>

          {activeTurn && (
            <button onClick={() => setShowCashMovementModal(true)}
              className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800 rounded-xl text-xs font-bold transition-all shadow-sm bg-white flex items-center gap-1.5 cursor-pointer">
              <DollarSign className="w-3.5 h-3.5" />
              <span>{t.cashMovement}</span>
            </button>
          )}

          <button onClick={() => setShowSalesHistoryModal(true)}
            className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800 rounded-xl text-xs font-bold transition-all shadow-sm bg-white flex items-center gap-1.5 cursor-pointer">
            <History className="w-3.5 h-3.5" />
            <span>{t.salesHistory}</span>
          </button>

          {profile?.rol === 'admin' && (
            <button onClick={() => navigate('/admin')}
              className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800 rounded-xl text-xs font-bold transition-all shadow-sm bg-white">
              {lang === 'es' ? 'Volver a Admin' : 'Back to Admin'}
            </button>
          )}

          {activeTurn ? (
            <button onClick={() => navigate('/pos/cierre')}
              className="px-3 py-1.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer">
              <Lock className="w-3.5 h-3.5" />
              <span>{t.closeTurnBtn}</span>
            </button>
          ) : (
            <button onClick={() => { signOut().then(() => navigate('/login')).catch(console.error); }}
              className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-rose-600 rounded-xl text-xs font-bold transition-all shadow-sm bg-white flex items-center gap-1.5">
              <LogOut className="w-3.5 h-3.5" />
              <span>{t.logout}</span>
            </button>
          )}
        </div>
      </header>

      {!activeTurn ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl max-w-md w-full p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto shadow-inner">
              <Lock className="w-8 h-8 text-slate-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-slate-900">{t.drawerClosed}</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                {lang === 'es'
                  ? 'Debes aperturar un turno de caja para esta sucursal antes de poder operar en la terminal de venta y registrar ingresos.'
                  : 'You must open a cash register turn for this branch before operating the sale terminal and recording income.'}
              </p>
            </div>
            <button onClick={() => setShowOpenModal(true)}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-blue-500/10 flex items-center justify-center gap-2">
              <Unlock className="w-4 h-4" />
              <span>{t.openTurnBtn}</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Attention Tabs Bar */}
          <div className="flex items-center bg-white border-b border-slate-200 px-3 py-1.5 gap-1 overflow-x-auto">
            {attentions.map((att) => {
              const isActive = att.id === activeAttentionId;
              const itemCount = att.cart.reduce((s, c) => s + c.cantidad, 0);
              return (
                <div
                  key={att.id}
                  className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm'
                      : 'bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-transparent hover:border-slate-200'
                    }`}
                  onClick={() => setActiveAttentionId(att.id)}
                >
                  <span
                    contentEditable={isActive}
                    suppressContentEditableWarning
                    onBlur={(e) => handleRenameAttention(att.id, e.currentTarget.textContent || att.customerName)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        (e.target as HTMLElement).blur();
                      }
                    }}
                    className="outline-none border-b border-dashed border-transparent focus:border-blue-400 max-w-[120px] truncate"
                    title={lang === 'es' ? 'Click para renombrar' : 'Click to rename'}
                  >
                    {att.customerName}
                  </span>
                  {itemCount > 0 && (
                    <span className={`text-[10px] font-mono ${isActive ? 'text-blue-500' : 'text-slate-400'}`}>
                      ({itemCount})
                    </span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleCloseAttention(att.id); }}
                    className="opacity-0 group-hover:opacity-100 hover:bg-slate-200 rounded p-0.5 text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
                    title={lang === 'es' ? 'Cerrar atención' : 'Close attention'}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
            <button
              onClick={handleAddAttention}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-dashed border-slate-300 hover:border-blue-300 transition-all whitespace-nowrap cursor-pointer"
              title={lang === 'es' ? 'Nueva atención' : 'New attention'}
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{lang === 'es' ? 'Nueva' : 'New'}</span>
            </button>
          </div>

          {/* Mobile Tab Bar — visible only on screens < lg */}
          <div className="lg:hidden flex bg-white border-b border-slate-200">
            <button onClick={() => setActiveMobileTab('catalog')}
              className={`flex-1 py-3 text-xs font-bold text-center transition-all flex items-center justify-center gap-1.5 ${activeMobileTab === 'catalog'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30'
                  : 'text-slate-500 hover:text-slate-800'
                }`}>
              <Package className="w-3.5 h-3.5" />
              <span>{t.catalogTab}</span>
            </button>
            <button onClick={() => setActiveMobileTab('cart')}
              className={`flex-1 py-3 text-xs font-bold text-center transition-all flex items-center justify-center gap-1.5 ${activeMobileTab === 'cart'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30'
                  : 'text-slate-500 hover:text-slate-800'
                }`}>
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>{t.cartTab} ({getActiveCart().reduce((sum, c) => sum + c.cantidad, 0)})</span>
            </button>
          </div>

          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Catalog Panel — visible on lg+ or when mobile tab is 'catalog' */}
            <div className={`${activeMobileTab === 'catalog' ? 'flex' : 'hidden'} lg:flex flex-1 h-full`}>
              <CatalogPanel
                loadingCatalog={loadingCatalog}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                t={t}
                lang={lang}
                addToCart={addToCart}
                filteredCatalog={filteredCatalog}
                getStockLabel={getStockLabel}
              />
            </div>

            {/* Cart Panel — visible on lg+ or when mobile tab is 'cart' */}
            <div className={`${activeMobileTab === 'cart' ? 'flex' : 'hidden'} lg:flex h-full`}>
              <CartPanel
                cart={getActiveCart()}
                t={t}
                processingSale={processingSale}
                saleSuccessMessage={saleSuccessMessage}
                getCartTotal={getCartTotal}
                updateCartQty={updateCartQty}
                removeFromCart={removeFromCart}
                handleCheckout={handleCheckout}
                barberos={barberos}
                selectedBarberoId={selectedBarberoId}
                setSelectedBarberoId={setSelectedBarberoId}
              />
            </div>
          </div>
        </>
      )}

      {/* New Attention Modal */}
      {showNewAttentionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowNewAttentionModal(false)}>
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm shadow-xl p-6 space-y-6 text-slate-800 animate-in fade-in zoom-in duration-205"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-950 flex items-center gap-2">
                <UserPlus className="w-4.5 h-4.5 text-blue-600" />
                <span>{lang === 'es' ? 'Nueva Atención' : 'New Attention'}</span>
              </h2>
              <button onClick={() => setShowNewAttentionModal(false)}
                className="text-slate-400 hover:text-slate-600 focus:outline-none">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1 relative">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {lang === 'es' ? 'Cliente (opcional)' : 'Customer (optional)'}
                </label>
                <input type="text" value={newAttClienteNombre}
                  onChange={(e) => { 
                    setNewAttClienteNombre(e.target.value); 
                    setNewAttClienteExistente(false);
                    setNewAttClienteId(null);
                    setShowSuggestions(false); 
                  }}
                  onFocus={() => { if (clienteSuggestions.length > 0) setShowSuggestions(true); }}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder={t.clientePlaceholder || 'Nombre del cliente...'}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-blue-500 transition-all text-xs shadow-sm"
                />
                {showSuggestions && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-10 max-h-48 overflow-y-auto">
                    {clienteSuggestions.map((c) => (
                      <button key={c.id} type="button"
                        onMouseDown={() => { 
                          setNewAttClienteNombre(c.nombre); 
                          setNewAttGuardarCliente(false); 
                          setNewAttClienteExistente(true); 
                          setNewAttClienteId(c.id);
                          setShowSuggestions(false); 
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center justify-between first:rounded-t-xl last:rounded-b-xl cursor-pointer"
                      >
                        <span className="truncate">{c.nombre}</span>
                        <span className="text-[9px] font-extrabold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 uppercase tracking-wider shrink-0">
                          Registrado
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <label className={`flex items-center gap-2 ${newAttClienteExistente ? '' : 'cursor-pointer select-none'}`}>
                <button type="button" role="checkbox" aria-checked={newAttGuardarCliente}
                  onClick={() => { if (!newAttClienteExistente) setNewAttGuardarCliente(!newAttGuardarCliente); }}
                  className={`relative w-9 h-5 rounded-full transition-all shrink-0 ${newAttClienteExistente ? 'bg-slate-200 cursor-not-allowed' : newAttGuardarCliente ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${newAttGuardarCliente ? 'translate-x-4' : ''
                    }`} />
                </button>
                <span className={`text-[10px] font-bold tracking-wide ${newAttClienteExistente ? 'text-slate-300' : 'text-slate-500'}`}>
                  {newAttClienteExistente
                    ? (lang === 'es' ? 'Cliente ya registrado' : 'Existing customer')
                    : (t.guardarCliente || 'Guardar cliente')
                  }
                </span>
              </label>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowNewAttentionModal(false)}
                className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer">
                {lang === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
              <button onClick={handleConfirmNewAttention}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer">
                {lang === 'es' ? 'Crear Atención' : 'Create Attention'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Open Turn Modal */}
      {showOpenModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm shadow-xl p-6 space-y-6 text-slate-800 animate-in fade-in zoom-in duration-205">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-950 flex items-center gap-2">
                <Unlock className="w-4.5 h-4.5 text-blue-600" />
                <span>{t.openTurnBtn}</span>
              </h2>
              <button onClick={() => setShowOpenModal(false)}
                className="text-slate-400 hover:text-slate-600 focus:outline-none">
                <X className="w-4 h-4" />
              </button>
            </div>

            {openError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs flex items-center gap-1.5 shadow-sm">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>{openError}</span>
              </div>
            )}

            <form onSubmit={handleOpenTurn} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {t.baseAmount}
                </label>
                <input type="number" step="0.01" required placeholder="100.00"
                  value={openBaseCash} onChange={(e) => setOpenBaseCash(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 transition-all text-xs font-mono font-bold shadow-sm" />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowOpenModal(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-sm">
                  {t.cancel}
                </button>
                <button type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 transition-all">
                  {t.confirmOpen}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Checkout / Split Payments Modal */}
      {showCheckoutModal && (
        <>
          {/* Overlay to dim background (only covers catalog region on large screens) */}
          <div className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-xs transition-opacity lg:block hidden"
            onClick={() => setShowCheckoutModal(false)} />

          {/* Slide-over panel aligning with CartPanel width (w-96) */}
          <div className="fixed inset-y-0 right-0 z-50 w-full lg:w-96 bg-white border-l border-slate-200 shadow-2xl flex flex-col justify-between h-full animate-in slide-in-from-right duration-200">

            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
              <h2 className="text-sm font-bold text-slate-950 flex items-center gap-2">
                <ShoppingCart className="w-4.5 h-4.5 text-blue-600" />
                <span>{t.checkoutTitle}</span>
              </h2>
              <button onClick={() => setShowCheckoutModal(false)}
                className="text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer p-1.5 hover:bg-slate-50 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cliente Section — always visible, above scroll */}
            {activeAttention && (
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 space-y-2 relative">
                <div className="relative">
                  <input type="text"
                    value={activeAttention.clienteNombre || ''}
                    onChange={(e) => {
                      updateAttention(activeAttention.id, { clienteNombre: e.target.value, clienteExistente: false });
                      setShowCheckoutSuggestions(false);
                    }}
                    onFocus={() => { if (!activeAttention.clienteExistente && checkoutClienteSuggestions.length > 0) setShowCheckoutSuggestions(true); }}
                    onBlur={() => setTimeout(() => setShowCheckoutSuggestions(false), 200)}
                    placeholder={t.clientePlaceholder || 'Buscar cliente por nombre...'}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-blue-500 text-xs font-semibold text-slate-800 shadow-2xs placeholder:text-slate-400"
                  />
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />

                  {/* Suggestions List Dropdown */}
                  {showCheckoutSuggestions && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-150">
                      {checkoutClienteSuggestions.map((c) => (
                        <button key={c.id} type="button"
                          onMouseDown={() => {
                            updateAttention(activeAttention.id, { clienteNombre: c.nombre, guardarCliente: false, clienteExistente: true });
                            setShowCheckoutSuggestions(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-800 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center justify-between cursor-pointer"
                        >
                          <span className="truncate">{c.nombre}</span>
                          <span className="text-[9px] font-extrabold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 uppercase tracking-wider shrink-0">
                            Registrado
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <label className={`flex items-center gap-2 ${activeAttention.clienteExistente ? '' : 'cursor-pointer select-none'}`}>
                  <button 
                    type="button" 
                    role="checkbox" 
                    aria-checked={!!activeAttention.guardarCliente}
                    disabled={!!activeAttention.clienteExistente}
                    onClick={() => {
                      if (!activeAttention.clienteExistente) {
                        updateAttention(activeAttention.id, { guardarCliente: !activeAttention.guardarCliente });
                      }
                    }}
                    className={`relative w-9 h-5 rounded-full transition-all shrink-0 ${
                      activeAttention.clienteExistente 
                        ? 'bg-slate-200 cursor-not-allowed' 
                        : activeAttention.guardarCliente 
                          ? 'bg-blue-600' 
                          : 'bg-slate-300'
                    }`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                      activeAttention.guardarCliente ? 'translate-x-4' : ''
                    }`} />
                  </button>
                  <span className={`text-[10px] font-bold tracking-wide ${
                    activeAttention.clienteExistente ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    {activeAttention.clienteExistente
                      ? (lang === 'es' ? 'Cliente ya registrado' : 'Existing customer')
                      : (t.guardarCliente || 'Guardar cliente nuevo')
                    }
                  </span>
                </label>
              </div>
            )}

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {(() => {
                const totalVenta = getCartTotal();
                const totalIngresado = pagos.reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0);
                const saldoRestante = Math.max(0, totalVenta - totalIngresado);
                const vuelto = Math.max(0, totalIngresado - totalVenta);

                const tieneEfectivo = pagos.some(p => p.metodo_pago === 'efectivo');
                const vueltoIlegal = vuelto > 0.01 && !tieneEfectivo;

                return (
                  <div className="space-y-6">
                    {/* Financial Summary */}
                    <div className="grid grid-cols-2 gap-3 bg-slate-50 border border-slate-200/80 p-4 rounded-xl text-center">
                      <div className="space-y-0.5 border-r border-slate-200">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t.total}</span>
                        <span className="text-sm font-extrabold text-slate-900 font-mono">{formatMoney(totalVenta)}</span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t.totalReceived}</span>
                        <span className="text-sm font-extrabold text-slate-850 font-mono">{formatMoney(totalIngresado)}</span>
                      </div>
                    </div>

                    {/* Vuelto / Saldo Banners */}
                    {totalIngresado < totalVenta ? (
                      <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-xs flex justify-between items-center shadow-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                          <span className="font-bold">{lang === 'es' ? 'Saldo Restante' : 'Remaining Balance'}</span>
                        </div>
                        <span className="font-mono font-extrabold text-sm">{formatMoney(saldoRestante)}</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs flex justify-between items-center shadow-sm">
                          <div className="flex items-center gap-2">
                            <span>✓</span>
                            <span className="font-bold">{lang === 'es' ? 'Pago Completado' : 'Payment Completed'}</span>
                          </div>
                          {vuelto > 0 && (
                            <div className="text-right">
                              <span className="block text-[9px] font-bold uppercase text-emerald-600">{lang === 'es' ? 'Vuelto' : 'Change'}</span>
                              <span className="font-mono font-extrabold text-sm">{formatMoney(vuelto)}</span>
                            </div>
                          )}
                        </div>

                        {vueltoIlegal && (
                          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-[10px] leading-normal flex items-start gap-2 shadow-sm font-medium">
                            <span>⚠️</span>
                            <span>{lang === 'es' ? 'Solo el pago en efectivo permite recibir montos superiores para generar vuelto.' : 'Only cash payments allow overpayment to generate change.'}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Payment Lines */}
                    <div className="space-y-3">
                      {pagos.map((pago, index) => (
                        <div key={index} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm transition-all duration-105">
                          {/* Method Selector */}
                          <div className="flex-1 min-w-[100px]">
                            <select
                              value={pago.metodo_pago}
                              onChange={(e) => {
                                const updated = [...pagos];
                                updated[index].metodo_pago = e.target.value;
                                setPagos(updated);
                              }}
                              className="w-full px-2.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer capitalize"
                            >
                              <option value="">{lang === 'es' ? 'Elegir método...' : 'Select method...'}</option>
                              {(config?.metodos_pago || ['efectivo', 'tarjeta', 'transferencia']).map((m) => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                          </div>

                          {/* Amount Input */}
                          <div className="relative w-28 flex-shrink-0">
                            <input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={pago.monto}
                              onChange={(e) => {
                                const updated = [...pagos];
                                updated[index].monto = e.target.value;
                                setPagos(updated);
                              }}
                              className="w-full pl-3 pr-6 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 text-xs font-mono font-bold text-right"
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">
                              $
                            </span>
                          </div>

                          {/* Delete Button */}
                          {pagos.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                setPagos(pagos.filter((_, i) => i !== index));
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Quick Cash Amounts */}
                    {pagos.some(p => p.metodo_pago === 'efectivo') && saldoRestante > 0 && (
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 space-y-2">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                          {lang === 'es' ? 'Montos rápidos en efectivo' : 'Quick cash amounts'}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {[10, 20, 50, 100].map((amount) => {
                            const cashAmount = Math.ceil((totalVenta - (totalIngresado - (pagos.find(p => p.metodo_pago === 'efectivo')?.monto ? parseFloat(pagos.find(p => p.metodo_pago === 'efectivo')!.monto) : 0))) / amount) * amount;
                            return (
                              <button key={amount}
                                type="button"
                                onClick={() => {
                                  const updated = pagos.map(p => p.metodo_pago === 'efectivo' ? { ...p, monto: Math.max(parseFloat(p.monto) || 0, cashAmount).toFixed(2) } : p);
                                  setPagos(updated);
                                }}
                                className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 rounded-lg text-[10px] font-extrabold transition-all shadow-sm cursor-pointer"
                              >
                                {formatMoney(cashAmount)}
                              </button>
                            );
                          })}
                          <button
                            type="button"
                            onClick={() => {
                              const updated = pagos.map(p => p.metodo_pago === 'efectivo' ? { ...p, monto: saldoRestante.toFixed(2) } : p);
                              setPagos(updated);
                            }}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[10px] font-extrabold transition-all shadow-sm cursor-pointer"
                          >
                            {lang === 'es' ? 'Exacto' : 'Exact'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Quick Button Favorites & Add Button */}
                    <div className="space-y-4 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...pagos];
                          updated.push({ metodo_pago: '', monto: Math.max(0, saldoRestante).toFixed(2) });
                          setPagos(updated);
                        }}
                        className="w-full py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer font-semibold"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{t.addPayment}</span>
                      </button>

                      {/* Favorites Quick actions */}
                      {config?.metodos_pago_favoritos && config.metodos_pago_favoritos.length > 0 && saldoRestante > 0 && (
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 space-y-2">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                            {t.paymentMethodsFav}
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {config.metodos_pago_favoritos.map((favMethod) => (
                              <button
                                key={favMethod}
                                type="button"
                                onClick={() => {
                                  const emptyIndex = pagos.findIndex(p => p.metodo_pago === '');
                                  if (emptyIndex !== -1) {
                                    const updated = [...pagos];
                                    updated[emptyIndex] = { metodo_pago: favMethod, monto: saldoRestante.toFixed(2) };
                                    setPagos(updated);
                                  } else {
                                    setPagos([...pagos, { metodo_pago: favMethod, monto: saldoRestante.toFixed(2) }]);
                                  }
                                }}
                                className="px-3 py-1.5 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all shadow-sm cursor-pointer"
                              >
                                {favMethod}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Sticky Actions Footer */}
            <div className="bg-slate-50 border-t border-slate-200 p-6 space-y-3">
              {(() => {
                const totalVenta = getCartTotal();
                const totalIngresado = pagos.reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0);

                const tieneEfectivo = pagos.some(p => p.metodo_pago === 'efectivo');
                const vueltoIlegal = (totalIngresado - totalVenta) > 0.01 && !tieneEfectivo;
                const tieneMetodoVacio = pagos.some(p => p.metodo_pago === '');
                const pagoCompleto = totalIngresado >= totalVenta && !vueltoIlegal && !tieneMetodoVacio;

                return (
                  <button
                    type="button"
                    disabled={!pagoCompleto || processingSale}
                    onClick={submitCheckout}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {processingSale ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{t.confirmSale}</span>
                      </>
                    )}
                  </button>
                );
              })()}
              <button
                type="button"
                onClick={() => setShowCheckoutModal(false)}
                className="w-full py-2.5 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl font-bold text-xs transition-all cursor-pointer animate-none"
              >
                {t.cancel}
              </button>
            </div>

          </div>
        </>
      )}

      {showCashMovementModal && (
        <CashMovementModal
          onClose={() => setShowCashMovementModal(false)}
          onSuccess={(msg) => {
            setSaleSuccessMessage(msg);
            setTimeout(() => setSaleSuccessMessage(null), 5000);
          }}
        />
      )}

      {showSalesHistoryModal && (
        <SalesHistoryModal
          onClose={() => setShowSalesHistoryModal(false)}
        />
      )}

      {/* ─── Success Receipt Modal (Slide-over on the Right) ────────────────────────── */}
      {successReceiptData && createPortal(
        <>
          {/* Overlay sobre el modal checkout previo */}
          <div className="fixed inset-0 z-[110] bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200" 
            onClick={() => setSuccessReceiptData(null)} />

          {/* Slide-over panel coincidiendo con el ancho del Checkout/CartPanel (w-96) */}
          <div className="fixed inset-y-0 right-0 z-[110] w-full lg:w-96 bg-white border-l border-slate-200 shadow-2xl flex flex-col justify-between h-full animate-in slide-in-from-right duration-200">
            
            {/* Header */}
            <div className="px-6 py-4 pt-[max(1rem,env(safe-area-inset-top))] border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
              <h2 className="text-sm font-bold text-slate-950 flex items-center gap-2">
                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
                <span>{lang === 'es' ? 'Venta Procesada' : 'Sale Completed'}</span>
              </h2>
              <button onClick={() => setSuccessReceiptData(null)}
                className="text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer p-1.5 hover:bg-slate-50 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Icon & Title Badge */}
              <div className="text-center space-y-3 pt-2">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto ring-8 ring-emerald-50 shadow-2xs">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-950">
                    {lang === 'es' ? '¡Venta Procesada con Éxito!' : 'Sale Processed Successfully!'}
                  </h2>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    {lang === 'es' ? 'Comprobante y registro guardados en caja' : 'Receipt and record stored in shift register'}
                  </p>
                </div>
              </div>

              {/* Ticket Card */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-4 font-sans shadow-2xs">
                
                {/* Total & Change */}
                <div className="flex justify-between items-baseline border-b border-slate-200/80 pb-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {lang === 'es' ? 'Total Cobrado' : 'Total Paid'}
                    </span>
                    <span className="text-2xl font-black font-mono text-slate-900">
                      {formatMoney(successReceiptData.total)}
                    </span>
                  </div>
                  {successReceiptData.vuelto > 0 && (
                    <div className="text-right bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                      <span className="text-[9px] font-extrabold uppercase text-emerald-600 block">
                        {lang === 'es' ? 'Vuelto Entregado' : 'Change Given'}
                      </span>
                      <span className="text-sm font-black font-mono text-emerald-800">
                        {formatMoney(successReceiptData.vuelto)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Details Grid */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span className="font-semibold text-slate-400">{lang === 'es' ? 'Atendido por:' : 'Staff:'}</span>
                    <span className="font-bold text-slate-900">{successReceiptData.barberoNombre}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span className="font-semibold text-slate-400">{lang === 'es' ? 'Cliente:' : 'Customer:'}</span>
                    <span className="font-bold text-slate-900">{successReceiptData.clienteNombre}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span className="font-semibold text-slate-400">{lang === 'es' ? 'Total Ítems:' : 'Total Items:'}</span>
                    <span className="font-bold font-mono text-slate-900">{successReceiptData.itemsCount}</span>
                  </div>
                </div>

                {/* Payment breakdown */}
                <div className="border-t border-slate-200/80 pt-3 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {lang === 'es' ? 'Desglose de Pago' : 'Payment Breakdown'}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {successReceiptData.pagos.map((p, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-800 font-mono shadow-2xs">
                        <span className="capitalize">{p.metodo_pago}:</span> {formatMoney(p.monto)}
                      </span>
                    ))}
                  </div>
                </div>

              </div>

            </div>

            {/* Footer Actions */}
            <div className="bg-slate-50/90 border-t border-slate-200 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] space-y-2.5 shrink-0">
              {/* Opcion de imprimir comprobante comentada temporalmente:
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-500" />
                <span>{lang === 'es' ? 'Imprimir Comprobante / Ticket' : 'Print Receipt'}</span>
              </button>
              */}

              <button
                type="button"
                onClick={() => setSuccessReceiptData(null)}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{lang === 'es' ? 'Nueva Venta' : 'New Sale'}</span>
              </button>
            </div>

          </div>
        </>,
        document.body
      )}
    </div>
  );
};
