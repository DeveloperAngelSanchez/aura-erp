import React, { useEffect, useState } from 'react';
import { supabase } from '../api/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

import { Bell, Package, X, Loader2 } from 'lucide-react';

interface StockItem {
  id: string;
  nombre: string;
  stock_actual: number;
  stock_minimo: number;
  tipo: string;
  sucursal_nombre: string;
}

export const NotificationCenter: React.FC = () => {
  const { lang } = useLanguage();
  const { profile } = useAuth();
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const loadStockIssues = async () => {
    if (!profile?.sucursal_id) return;
    try {
      const { data, error } = await supabase
        .from('vista_items_stock_bajo')
        .select('*')
        .order('stock_actual', { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error('Error loading stock notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStockIssues();

    const channel = supabase
      .channel('stock-notifications')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'items' },
        () => { loadStockIssues(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile?.sucursal_id]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-800 transition-all"
      >
        <Bell className="w-5 h-5" />
        {items.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-sm">
            {items.length > 9 ? '9+' : items.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-96 flex flex-col">
          <div className="flex justify-between items-center px-4 py-3 border-b border-slate-100 shrink-0">
            <h3 className="text-xs font-bold text-slate-700">
              {lang === 'es' ? 'Notificaciones' : 'Notifications'}
            </h3>
            <button onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-2 space-y-1">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span className="text-xs">Cargando...</span>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-xs text-slate-400">
                  {lang === 'es' ? 'Todo en stock normal' : 'All stock levels normal'}
                </p>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                    <Package className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{item.nombre}</p>
                    <p className="text-[10px] text-slate-400">
                      {item.stock_actual}/{item.stock_minimo} {item.sucursal_nombre ? `· ${item.sucursal_nombre}` : ''}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    item.stock_actual <= 0
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {item.stock_actual}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
