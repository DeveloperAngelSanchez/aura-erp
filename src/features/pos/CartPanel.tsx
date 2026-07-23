import React from 'react';
import { useSettings } from '../../context/SettingsContext';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  CheckCircle2,
  Package,
  Scissors,
  Gift,
} from 'lucide-react';

interface Item {
  id: string;
  nombre: string;
  tipo: 'producto' | 'servicio' | 'kit';
  precio_venta: number;
  stock_actual: number;
  inventariable?: boolean;
  vista_stock_kits?: any;
  moneda?: string | null;
}

export interface CartItem {
  item: Item;
  cantidad: number;
}

interface CartPanelProps {
  cart: CartItem[];
  t: Record<string, string>;
  processingSale: boolean;
  saleSuccessMessage: string | null;
  getCartTotal: () => number;
  updateCartQty: (itemId: string, delta: number) => void;
  removeFromCart: (itemId: string) => void;
  handleCheckout: () => void;
  barberos: any[];
  selectedBarberoId: string;
  setSelectedBarberoId: (id: string) => void;
}

const getItemIcon = (tipo: 'producto' | 'servicio' | 'kit') => {
  switch (tipo) {
    case 'producto': return <Package className="w-5 h-5 text-emerald-600" />;
    case 'servicio': return <Scissors className="w-5 h-5 text-purple-600" />;
    case 'kit': return <Gift className="w-5 h-5 text-blue-600" />;
  }
};

export const CartPanel: React.FC<CartPanelProps> = ({
  cart, t, processingSale, saleSuccessMessage,
  getCartTotal, updateCartQty, removeFromCart, handleCheckout,
  barberos, selectedBarberoId, setSelectedBarberoId,
}) => {
  const { formatMoney } = useSettings();

  return (
    <div className="w-full lg:w-96 bg-white border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col justify-between h-full shadow-lg z-10">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">

        {/* Selector de Barbero - Alineado estéticamente */}
        <div className="relative w-full mb-4">
          <select
            value={selectedBarberoId}
            onChange={(e) => setSelectedBarberoId(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-xs font-bold text-slate-700 shadow-sm appearance-none cursor-pointer"
          >
            <option value="">{t.selectBarbero || 'Seleccionar Barbero...'}</option>
            {barberos.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nombre}
              </option>
            ))}
          </select>
          <Scissors className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px] font-bold">
            ▼
          </div>
        </div>


        <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-blue-600" />
          <span>{t.cartTitle} ({cart.reduce((sum, c) => sum + c.cantidad, 0)})</span>
        </h2>

        {saleSuccessMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl text-xs flex items-center gap-2 shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{saleSuccessMessage}</span>
          </div>
        )}

        {cart.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs italic">
            {t.cartEmpty}
          </div>
        ) : (
          <div className="space-y-3 divide-y divide-slate-100">
            {cart.map((cartItem, idx) => (
              <div key={cartItem.item.id} className={`flex gap-3 items-center ${idx > 0 ? 'pt-3' : ''}`}>
                <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-150 flex items-center justify-center shadow-sm">
                  {getItemIcon(cartItem.item.tipo)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-slate-800 truncate">{cartItem.item.nombre}</h4>
                  <p className="text-[10px] text-slate-400 font-mono font-bold">{formatMoney(cartItem.item.precio_venta, cartItem.item.moneda || undefined)}</p>
                </div>

                <div className="flex items-center border border-slate-200 rounded-lg shadow-sm bg-slate-50">
                  <button onClick={() => updateCartQty(cartItem.item.id, -1)}
                    className="p-1 hover:bg-slate-200 text-slate-500 rounded-l-lg transition-colors cursor-pointer">
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="px-2.5 text-xs font-bold text-slate-800 font-mono">{cartItem.cantidad}</span>
                  <button onClick={() => updateCartQty(cartItem.item.id, 1)}
                    className="p-1 hover:bg-slate-200 text-slate-500 rounded-r-lg transition-colors cursor-pointer">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <button onClick={() => removeFromCart(cartItem.item.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-50 rounded-lg transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-slate-50 border-t border-slate-200 p-6 space-y-4">
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-500 font-medium">
            <span>{t.subtotal}</span>
            <span className="font-mono font-bold">{formatMoney(getCartTotal())}</span>
          </div>
          <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200/60 pt-2">
            <span>{t.total}</span>
            <span className="font-mono text-base font-extrabold text-blue-600">{formatMoney(getCartTotal())}</span>
          </div>
        </div>

        <button onClick={handleCheckout} disabled={cart.length === 0 || processingSale}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
          {processingSale ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          ) : (
            <>
              <span>{t.processSale} ({formatMoney(getCartTotal())})</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
