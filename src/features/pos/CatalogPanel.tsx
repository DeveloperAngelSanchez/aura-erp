import React from 'react';
import { Search, Package, Scissors, Gift } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';

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

interface CatalogPanelProps {
  loadingCatalog: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedCategory: 'all' | 'producto' | 'servicio' | 'kit';
  setSelectedCategory: (cat: 'all' | 'producto' | 'servicio' | 'kit') => void;
  t: Record<string, string>;
  lang: string;
  addToCart: (item: Item) => void;
  filteredCatalog: Item[];
  getStockLabel: (item: Item) => string;
}

const getItemIcon = (tipo: 'producto' | 'servicio' | 'kit') => {
  switch (tipo) {
    case 'producto': return <Package className="w-5 h-5 text-emerald-600" />;
    case 'servicio': return <Scissors className="w-5 h-5 text-purple-600" />;
    case 'kit': return <Gift className="w-5 h-5 text-blue-600" />;
  }
};

export const CatalogPanel: React.FC<CatalogPanelProps> = ({
  loadingCatalog, searchTerm, setSearchTerm,
  selectedCategory, setSelectedCategory, t, lang,
  addToCart, filteredCatalog, getStockLabel,
}) => {
  const { formatMoney } = useSettings();

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto space-y-4">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        <div className="flex bg-white p-1 border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
          {(['all', 'producto', 'servicio', 'kit'] as const).map((cat) => (
            <button key={cat} onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:text-slate-800'
              }`}>
              {cat === 'all' ? t.categoriesAll :
               cat === 'producto' ? t.categoriesProducts :
               cat === 'servicio' ? t.categoriesServices : t.categoriesKits}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <input type="text" placeholder={t.searchPlaceholder}
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-xs text-slate-850 shadow-sm placeholder:text-slate-400" />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
        </div>
      </div>

      {loadingCatalog ? (
        <div className="flex-1 flex items-center justify-center p-12 text-slate-400">
          <span className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin inline-block mr-2.5"></span>
          <span className="text-xs">Cargando catálogo...</span>
        </div>
      ) : filteredCatalog.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-xs italic p-12">
          No items found.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCatalog.map((item) => {
            const stock = item.tipo === 'kit'
              ? (item.vista_stock_kits?.stock_calculado ?? 0)
              : item.stock_actual;
            const isOutOfStock = item.tipo === 'producto' && item.inventariable !== false && stock <= 0;

            return (
              <div key={item.id}
                className={`bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-all duration-200 ${
                  isOutOfStock ? 'opacity-65' : ''
                }`}>
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-150 flex items-center justify-center shadow-sm">
                    {getItemIcon(item.tipo)}
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="font-bold text-slate-900 text-xs tracking-tight line-clamp-2 min-h-[32px]">{item.nombre}</h3>
                    <span className={`text-[9px] font-bold uppercase tracking-wider ${
                      item.tipo === 'producto' ? 'text-emerald-600' : item.tipo === 'servicio' ? 'text-purple-600' : 'text-blue-600'
                    }`}>
                      {getStockLabel(item)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="font-extrabold text-slate-950 font-mono text-sm">
                    {formatMoney(item.precio_venta, item.moneda || undefined)}
                  </span>
                  <button onClick={() => addToCart(item)} disabled={isOutOfStock}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                      isOutOfStock
                        ? 'bg-rose-50 border border-rose-100 text-rose-500 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                    }`}>
                    {isOutOfStock ? t.outOfStock : `+ ${lang === 'es' ? 'Añadir' : 'Add'}`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
