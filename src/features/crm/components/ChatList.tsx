import React from 'react';
import {
  Search,
  MessageSquare,
  Sparkles,
  Clock,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import type { CRMConversacion, FiltroEstadoCRM } from '../types/crm';

interface ChatListProps {
  conversaciones: CRMConversacion[];
  conversacionActivaId?: string;
  filtroEstado: FiltroEstadoCRM;
  onSelectFiltro: (filtro: FiltroEstadoCRM) => void;
  busqueda: string;
  onSearchChange: (val: string) => void;
  onSelectConversacion: (conv: CRMConversacion) => void;
  onSimularMensaje: () => void;
  loading: boolean;
}

export const ChatList: React.FC<ChatListProps> = ({
  conversaciones,
  conversacionActivaId,
  filtroEstado,
  onSelectFiltro,
  busqueda,
  onSearchChange,
  onSelectConversacion,
  onSimularMensaje,
  loading,
}) => {
  const formatearFechaHora = (isoStr: string) => {
    if (!isoStr) return '';
    const date = new Date(isoStr);
    const ahora = new Date();
    const esHoy = date.toDateString() === ahora.toDateString();

    if (esHoy) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getBadgeEstado = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle className="w-3 h-3" />
            Pendiente
          </span>
        );
      case 'en_proceso':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <UserCheck className="w-3 h-3" />
            En Proceso
          </span>
        );
      case 'cerrado':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            Cerrado
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Header del Chat Inbox */}
      <div className="p-4 border-b border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-slate-900 text-white">
              <MessageSquare className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 text-base leading-tight">
                Inbox TikTok
              </h2>
              <p className="text-xs text-slate-500">Mensajes y Leads Directos</p>
            </div>
          </div>

          <button
            onClick={onSimularMensaje}
            title="Simular mensaje entrante (Sandbox)"
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors border border-blue-200 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Simular Chat</span>
          </button>
        </div>

        {/* Buscador */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar contacto o mensaje..."
            value={busqueda}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
          />
        </div>

        {/* Tabs de Filtro */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-medium text-slate-600">
          {(['todos', 'pendiente', 'en_proceso', 'cerrado'] as FiltroEstadoCRM[]).map((tab) => (
            <button
              key={tab}
              onClick={() => onSelectFiltro(tab)}
              className={`flex-1 py-1 px-2 rounded-md capitalize transition-all text-center ${
                filtroEstado === tab
                  ? 'bg-white text-blue-600 font-semibold shadow-sm'
                  : 'hover:text-slate-900'
              }`}
            >
              {tab === 'todos' ? 'Todos' : tab.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Conversaciones */}
      <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {loading ? (
          <div className="flex items-center justify-center p-8 text-slate-400 gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
            <span className="text-xs">Cargando conversaciones...</span>
          </div>
        ) : conversaciones.length === 0 ? (
          <div className="p-8 text-center text-slate-400 space-y-2">
            <MessageSquare className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-xs font-medium text-slate-600">No hay conversaciones</p>
            <p className="text-xs text-slate-400">
              Prueba la función &quot;Simular Chat&quot; para enviar un mensaje de prueba al Sandbox.
            </p>
          </div>
        ) : (
          conversaciones.map((conv) => {
            const isActive = conv.id === conversacionActivaId;
            return (
              <button
                key={conv.id}
                onClick={() => onSelectConversacion(conv)}
                className={`w-full p-3.5 text-left flex gap-3 transition-colors relative ${
                  isActive
                    ? 'bg-blue-50/60 border-l-4 border-blue-600'
                    : 'hover:bg-slate-50 border-l-4 border-transparent'
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <img
                    src={
                      conv.avatar_url ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        conv.nombre_contacto
                      )}&background=0D8ABC&color=fff`
                    }
                    alt={conv.nombre_contacto}
                    className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-sm"
                  />
                  {conv.no_leidos > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white font-bold text-[10px] flex items-center justify-center rounded-full border-2 border-white">
                      {conv.no_leidos}
                    </span>
                  )}
                </div>

                {/* Info de Conversación */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <h3 className="font-semibold text-xs text-slate-900 truncate">
                      {conv.nombre_contacto}
                    </h3>
                    <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {formatearFechaHora(conv.ultimo_mensaje_at)}
                    </span>
                  </div>

                  {conv.username_contacto && (
                    <p className="text-[10px] text-blue-600 font-medium truncate">
                      {conv.username_contacto}
                    </p>
                  )}

                  <p className="text-xs text-slate-500 truncate leading-tight">
                    {conv.ultimo_mensaje || 'Conversación iniciada'}
                  </p>

                  <div className="flex items-center justify-between pt-1 flex-wrap gap-1">
                    {getBadgeEstado(conv.estado)}
                    {conv.cliente_id && (
                      <span className="text-[9px] text-emerald-700 bg-emerald-50 font-medium px-1.5 py-0.5 rounded border border-emerald-200">
                        Cliente ERP
                      </span>
                    )}
                    {conv.asignado_a && (
                      <span className="text-[9px] text-slate-500 bg-slate-100 font-medium px-1.5 py-0.5 rounded border border-slate-200 flex items-center gap-0.5">
                        👤 Asignado
                      </span>
                    )}
                  </div>

                  {/* Etiquetas y Prioridad (Fase 1) */}
                  <div className="flex flex-wrap gap-1 pt-1.5">
                    {conv.prioridad && conv.prioridad !== 'normal' && (
                      <span className={`text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded ${
                        conv.prioridad === 'urgente'
                          ? 'bg-rose-100 text-rose-700 border border-rose-200'
                          : 'bg-amber-100 text-amber-700 border border-amber-200'
                      }`}>
                        {conv.prioridad}
                      </span>
                    )}
                    {(conv.etiquetas || []).map((tag) => (
                      <span
                        key={tag.id}
                        className="text-[9px] px-1.5 py-0.5 rounded-full text-white font-semibold shadow-sm"
                        style={{ backgroundColor: tag.color }}
                      >
                        {tag.nombre}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
