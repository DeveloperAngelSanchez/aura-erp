import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  MessageSquare,
  PanelRightOpen,
  PanelRightClose,
  Zap,
  RefreshCw,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import type { CRMConversacion, CRMMensaje, EstadoConversacion } from '../types/crm';

interface ChatWindowProps {
  conversacion: CRMConversacion | null;
  mensajes: CRMMensaje[];
  cargandoMensajes: boolean;
  onEnviarMensaje: (texto: string) => Promise<void>;
  onCambiarEstado: (estado: EstadoConversacion) => Promise<void>;
  onTogglePanelDetalle: () => void;
  mostrarPanelDetalle: boolean;
  respuestasRapidas?: any[];
  onBack?: () => void;
}

const RESPUESTAS_RAPIDAS_FALLBACK = [
  '¡Hola! Claro que sí, con mucho gusto te brindamos información.',
  '¿Te gustaría agendar una cita o reserva para hoy?',
  'Nuestros horarios de atención son de Lunes a Sábado de 9:00 AM a 8:00 PM.',
  '¡Gracias por comunicarte con nosotros a través de TikTok!',
];

export const ChatWindow: React.FC<ChatWindowProps> = ({
  conversacion,
  mensajes,
  cargandoMensajes,
  onEnviarMensaje,
  onCambiarEstado,
  onTogglePanelDetalle,
  mostrarPanelDetalle,
  respuestasRapidas = [],
  onBack,
}) => {
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mostrarRespuestasRapidas, setMostrarRespuestasRapidas] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Obtener plantillas a usar (dinámicas de base de datos o fallback estático)
  const respuestasUsar = respuestasRapidas.length > 0 
    ? respuestasRapidas.map(r => r.contenido) 
    : RESPUESTAS_RAPIDAS_FALLBACK;

  // Auto-scroll al final al recibir o enviar un mensaje
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensajes]);

  if (!conversacion) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 p-8 text-center border-r border-slate-200">
        <div className="p-4 rounded-full bg-blue-50 text-blue-600 mb-4 border border-blue-100 shadow-sm">
          <MessageSquare className="w-10 h-10" />
        </div>
        <h3 className="text-base font-semibold text-slate-800">No hay chat seleccionado</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Selecciona una conversación de la lista de la izquierda o simula una nueva entrada de mensaje para comenzar.
        </p>
      </div>
    );
  }

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!texto.trim() || enviando) return;

    try {
      setEnviando(true);
      const msgTemp = texto;
      setTexto('');
      await onEnviarMensaje(msgTemp);
    } catch (err) {
      console.error('Error al enviar mensaje:', err);
    } finally {
      setEnviando(false);
    }
  };

  const formatearHora = (isoStr: string) => {
    if (!isoStr) return '';
    return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 border-r border-slate-200">
      {/* Header del Chat */}
      <div className="p-3.5 bg-white border-b border-slate-200 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-all cursor-pointer lg:hidden shrink-0"
              title="Volver a la lista"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <img
            src={
              conversacion.avatar_url ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                conversacion.nombre_contacto
              )}&background=0D8ABC&color=fff`
            }
            alt={conversacion.nombre_contacto}
            className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-sm shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-semibold text-sm text-slate-900 leading-none truncate">
                {conversacion.nombre_contacto}
              </h2>
              {conversacion.username_contacto && (
                <span className="text-xs text-blue-600 font-medium truncate">
                  {conversacion.username_contacto}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Vía TikTok Direct Messaging</p>
          </div>
        </div>

        {/* Acciones de la cabecera */}
        <div className="flex items-center gap-2">
          {/* Selector de Estado */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => onCambiarEstado('pendiente')}
              className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                conversacion.estado === 'pendiente'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Marcar como Pendiente"
            >
              <AlertCircle className="w-3 h-3" />
              <span className="hidden sm:inline">Pendiente</span>
            </button>
            <button
              onClick={() => onCambiarEstado('en_proceso')}
              className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                conversacion.estado === 'en_proceso'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Marcar en Proceso"
            >
              <UserCheck className="w-3 h-3" />
              <span className="hidden sm:inline">En Proceso</span>
            </button>
            <button
              onClick={() => onCambiarEstado('cerrado')}
              className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                conversacion.estado === 'cerrado'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Marcar como Cerrado"
            >
              <CheckCircle2 className="w-3 h-3" />
              <span className="hidden sm:inline">Cerrado</span>
            </button>
          </div>

          {/* Toggle Panel Detalle */}
          <button
            onClick={onTogglePanelDetalle}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
            title={mostrarPanelDetalle ? 'Ocultar info de contacto' : 'Ver info de contacto'}
          >
            {mostrarPanelDetalle ? (
              <PanelRightClose className="w-4 h-4" />
            ) : (
              <PanelRightOpen className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Cuerpo de Mensajes */}
      <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-3">
        {cargandoMensajes ? (
          <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
            <span className="text-xs">Cargando conversación...</span>
          </div>
        ) : mensajes.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            Sin mensajes anteriores en esta conversación.
          </div>
        ) : (
          mensajes.map((msg) => {
            const isOutbound = msg.direccion === 'outbound';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[75%] p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                    isOutbound
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.contenido}</p>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-1">
                  {formatearHora(msg.creado_en)} {isOutbound ? '• Enviado' : ''}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Respuestas Rápidas flotantes */}
      {mostrarRespuestasRapidas && (
        <div className="p-3 bg-white border-t border-slate-200 space-y-1 shadow-lg animate-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
            <span className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-500" /> Plantillas de Respuesta Rápida
            </span>
            <button
              onClick={() => setMostrarRespuestasRapidas(false)}
              className="text-slate-400 hover:text-slate-600 text-xs"
            >
              Cerrar
            </button>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {respuestasUsar.map((resp, i) => (
              <button
                key={i}
                onClick={() => {
                  setTexto(resp);
                  setMostrarRespuestasRapidas(false);
                }}
                className="text-left text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 p-2 rounded border border-slate-200 transition-colors truncate cursor-pointer"
              >
                {resp}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input de Mensaje */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMostrarRespuestasRapidas(!mostrarRespuestasRapidas)}
            className="p-2 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors shrink-0"
            title="Respuestas Rápidas"
          >
            <Zap className="w-4 h-4" />
          </button>

          <input
            type="text"
            placeholder="Escribe tu respuesta para TikTok..."
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            className="flex-1 min-w-0 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-slate-800"
          />

          <button
            type="submit"
            disabled={!texto.trim() || enviando}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium text-xs flex items-center gap-1.5 transition-colors shadow-sm shrink-0"
          >
            {enviando ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Enviar</span>
          </button>
        </div>
      </form>
    </div>
  );
};
