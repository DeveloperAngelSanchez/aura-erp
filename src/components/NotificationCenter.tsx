import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../api/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useEmpresa } from '../context/EmpresaContext';
import { useLanguage } from '../context/LanguageContext';
import { Bell, Package, X, Loader2, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';

interface StockItem {
  id: string;
  nombre: string;
  stock_actual: number;
  stock_minimo: number;
  tipo: string;
  sucursal_id: string;
  sucursal_nombre: string;
  empresa_nombre?: string;
}

export const NotificationCenter: React.FC = () => {
  const { lang } = useLanguage();
  const { profile } = useAuth();
  const { activeBranchIds, activeEmpresaNombre } = useEmpresa();
  const navigate = useNavigate();

  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  // Determinar sucursales activas según la empresa de la sesión actual
  const targetBranches = activeBranchIds.length > 0 
    ? activeBranchIds 
    : (profile?.sucursal_id ? [profile.sucursal_id] : []);

  const loadStockIssues = async () => {
    if (targetBranches.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // FILTRO ESTRICTO: Solo items de las sucursales pertenecientes a la empresa activa
      const { data, error } = await supabase
        .from('vista_items_stock_bajo')
        .select('*')
        .in('sucursal_id', targetBranches)
        .order('stock_actual', { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error('Error loading stock notifications for company:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStockIssues();

    if (targetBranches.length === 0) return;

    // Suscripción Realtime para actualizar al instante cuando cambie el inventario
    const channel = supabase
      .channel(`stock-notif-${targetBranches.join('-')}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'items' },
        () => { loadStockIssues(); }
      )
      .subscribe();

    return () => { 
      supabase.removeChannel(channel); 
    };
  }, [targetBranches.join(','), profile?.sucursal_id]);

  return (
    <div className="relative">
      {/* Botón de Campana con Badge Perfeccionado */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-800 transition-all cursor-pointer focus:outline-none"
        title={lang === 'es' ? 'Notificaciones de inventario' : 'Stock notifications'}
      >
        <Bell className="w-5 h-5 text-slate-600" />
        
        {items.length > 0 && (
          <span 
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-xs pointer-events-none tabular-nums animate-in zoom-in-75 duration-150"
          >
            {items.length > 99 ? '99+' : items.length}
          </span>
        )}
      </button>

      {/* Popover / Panel de Notificaciones */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-84 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-[28rem] flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
          
          {/* Header */}
          <div className="flex justify-between items-center px-4 py-3 border-b border-slate-100 bg-slate-50/70 shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-800">
                  {lang === 'es' ? 'Alertas de Inventario' : 'Stock Alerts'}
                </h3>
                {items.length > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-extrabold bg-rose-100 text-rose-700 rounded-full">
                    {items.length}
                  </span>
                )}
              </div>
              {activeEmpresaNombre && (
                <p className="text-[10px] text-slate-400 font-medium truncate max-w-[200px]">
                  {activeEmpresaNombre}
                </p>
              )}
            </div>

            <button 
              onClick={() => setOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body List */}
          <div className="overflow-y-auto flex-1 p-2 space-y-1 divide-y divide-slate-100">
            {loading ? (
              <div className="flex items-center justify-center py-10 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600 mr-2" />
                <span className="text-xs font-medium">{lang === 'es' ? 'Verificando stock...' : 'Checking stock...'}</span>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-10 px-4 space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-700">
                  {lang === 'es' ? 'Todo en orden' : 'Everything in order'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {lang === 'es' 
                    ? 'No hay productos con stock bajo o agotados en tu empresa.' 
                    : 'No low stock or exhausted products in your company.'}
                </p>
              </div>
            ) : (
              items.map((item) => {
                const isAgotado = item.stock_actual <= 0;
                return (
                  <div 
                    key={item.id} 
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors pt-2.5"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                      isAgotado 
                        ? 'bg-rose-50 text-rose-600 border-rose-100' 
                        : 'bg-amber-50 text-amber-600 border-amber-100'
                    }`}>
                      {isAgotado ? <AlertTriangle className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{item.nombre}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span className="truncate">{item.sucursal_nombre}</span>
                        <span>•</span>
                        <span>Mín: {item.stock_minimo}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${
                        isAgotado
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {isAgotado 
                          ? (lang === 'es' ? 'Agotado (0)' : 'Out (0)') 
                          : `${item.stock_actual} disp.`}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer CTA */}
          {items.length > 0 && (
            <div className="p-2.5 bg-slate-50 border-t border-slate-100 shrink-0">
              <button
                onClick={() => {
                  setOpen(false);
                  navigate('/admin/inventory');
                }}
                className="w-full py-2 px-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <span>{lang === 'es' ? 'Ver en Inventario' : 'View in Inventory'}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  );
};
