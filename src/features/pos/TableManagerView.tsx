import React, { useEffect, useState } from 'react';
import type { Mesa } from '../../hooks/useMesas';
import {
  Utensils,
  Clock,
  User,
  RefreshCw,
  LayoutGrid,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface TableManagerViewProps {
  mesas: Mesa[];
  loading: boolean;
  onSelectMesa: (mesaId: string) => void;
  onRefresh: () => void;
  formatMoney: (amount: number) => string;
  onOpenSettings?: () => void;
}

// Utility to calculate elapsed time in HH:MM:SS format
const getElapsedTime = (startTimeISO: string | null): string => {
  if (!startTimeISO) return '00:00';
  const start = new Date(startTimeISO).getTime();
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - start) / 1000));
  
  const hours = Math.floor(diffSec / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);
  const seconds = diffSec % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export const TableManagerView: React.FC<TableManagerViewProps> = ({
  mesas,
  loading,
  onSelectMesa,
  onRefresh,
  formatMoney,
  onOpenSettings,
}) => {
  // Live ticker state to update elapsed times every second
  const [, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const totalMesas = mesas.length;
  const ocupadasCount = mesas.filter(m => m.estado === 'ocupada').length;
  const disponiblesCount = mesas.filter(m => m.estado === 'disponible').length;
  const pendientesCount = mesas.filter(m => m.estado === 'pendiente').length;

  return (
    <div className="flex-1 bg-slate-50 flex flex-col h-full overflow-hidden">
      {/* Top Header / Stats Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap justify-between items-center gap-4 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 shadow-2xs">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Salón de Mesas</span>
              <span className="text-xs text-slate-400 font-mono font-bold bg-slate-100 px-2 py-0.5 rounded-full">
                {totalMesas} {totalMesas === 1 ? 'mesa' : 'mesas'}
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Selecciona una mesa para gestionar la comanda o aperturar atención
            </p>
          </div>
        </div>

        {/* Status Counters */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-bold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{disponiblesCount} Disponibles</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200/80 text-blue-800 text-xs font-bold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            <span>{ocupadasCount} Ocupadas</span>
          </div>

          {pendientesCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-bold shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce"></span>
              <span>{pendientesCount} Cuenta Pedida</span>
            </div>
          )}

          <button
            onClick={onRefresh}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all border border-transparent hover:border-slate-200 cursor-pointer"
            title="Refrescar mesas"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid Container */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-bold">Cargando estado del salón...</span>
          </div>
        ) : totalMesas === 0 ? (
          <div className="max-w-md mx-auto my-12 bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
              <Utensils className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">No hay mesas configuradas</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Ingresa a Ajustes de la Sucursal para definir la cantidad de mesas y su prefijo (ej. MS-01, MS-02...).
              </p>
            </div>
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10 cursor-pointer inline-flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Configurar Mesas</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {mesas.map((mesa) => {
              const isDisponible = mesa.estado === 'disponible';
              const isOcupada = mesa.estado === 'ocupada';
              const isPendiente = mesa.estado === 'pendiente';

              const cartTotal = (mesa.cart_data || []).reduce(
                (sum, item) => sum + item.cantidad * (item.precioUnitario ?? item.item.precio_venta),
                0
              );
              const totalItems = (mesa.cart_data || []).reduce((sum, item) => sum + item.cantidad, 0);

              // Styling per status
              let cardBg = 'bg-white hover:border-slate-300 hover:shadow-md';
              let badgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
              let statusText = 'Disponible';

              if (isOcupada) {
                cardBg = 'bg-white border-blue-300 hover:border-blue-400 hover:shadow-md ring-1 ring-blue-500/10';
                badgeBg = 'bg-blue-50 text-blue-700 border-blue-200';
                statusText = 'Ocupada';
              } else if (isPendiente) {
                cardBg = 'bg-white border-amber-300 hover:border-amber-400 hover:shadow-md ring-1 ring-amber-500/10';
                badgeBg = 'bg-amber-50 text-amber-700 border-amber-200';
                statusText = 'Cuenta Pedida';
              }

              return (
                <div
                  key={mesa.id}
                  onClick={() => onSelectMesa(mesa.id)}
                  className={`group relative border rounded-2xl p-4 flex flex-col justify-between h-44 cursor-pointer transition-all duration-200 shadow-xs ${cardBg}`}
                >
                  {/* Card Top: Name & Status Badge */}
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">
                        {mesa.nombre}
                      </h3>
                      {mesa.cliente_nombre && (
                        <p className="text-[10px] text-slate-500 font-bold truncate max-w-[100px] flex items-center gap-1 mt-0.5">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>{mesa.cliente_nombre}</span>
                        </p>
                      )}
                    </div>

                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg border uppercase tracking-wider ${badgeBg}`}
                    >
                      {statusText}
                    </span>
                  </div>

                  {/* Card Middle: Metrics (Elapsed Time & Items) */}
                  {!isDisponible ? (
                    <div className="space-y-1.5 my-auto">
                      <div className="flex items-center gap-1.5 text-slate-600 text-xs font-mono font-bold">
                        <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span>{getElapsedTime(mesa.abierta_en)}</span>
                      </div>

                      {totalItems > 0 && (
                        <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-semibold">
                          <Utensils className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            {totalItems} {totalItems === 1 ? 'item' : 'items'}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="my-auto text-slate-300 group-hover:text-blue-500/40 transition-colors flex items-center justify-center">
                      <Utensils className="w-8 h-8 stroke-[1.2]" />
                    </div>
                  )}

                  {/* Card Bottom: Total Money & Action CTA */}
                  <div className="border-t border-slate-100 pt-2.5 flex justify-between items-center mt-auto">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                        {!isDisponible ? 'Consumido' : 'Estado'}
                      </span>
                      <span
                        className={`text-sm font-extrabold font-mono ${
                          !isDisponible ? 'text-slate-900' : 'text-emerald-600'
                        }`}
                      >
                        {!isDisponible ? formatMoney(cartTotal) : 'Libre'}
                      </span>
                    </div>

                    <div className="w-7 h-7 rounded-lg bg-slate-50 group-hover:bg-blue-600 text-slate-400 group-hover:text-white flex items-center justify-center transition-all shadow-2xs">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
