import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Phone,
  Mail,
  FileText,
  Save,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import type { CRMConversacion } from '../types/crm';
import { tiktokService } from '../services/tiktokService';

interface ContactDetailPanelProps {
  conversacion: CRMConversacion | null;
  empresaId: string;
  sucursalId?: string | null;
  onUpdateConversacion: () => void;
  // Fase 1 empresariales
  etiquetasConfig: any[];
  agentes: { id: string; nombre: string; rol: string }[];
  onAsignarAgente: (convId: string, agenteId: string | null) => Promise<void>;
  onCambiarPrioridad: (convId: string, prioridad: any) => Promise<void>;
  onVincularEtiqueta: (convId: string, etiquetaId: string) => Promise<void>;
  onDesvincularEtiqueta: (convId: string, etiquetaId: string) => Promise<void>;
  onCrearEtiqueta: (nombre: string, color: string) => Promise<any>;
  onBack?: () => void;
}

export const ContactDetailPanel: React.FC<ContactDetailPanelProps> = ({
  conversacion,
  empresaId: _empresaId,
  sucursalId,
  onUpdateConversacion,
  etiquetasConfig,
  agentes,
  onAsignarAgente,
  onCambiarPrioridad,
  onVincularEtiqueta,
  onDesvincularEtiqueta,
  onCrearEtiqueta,
  onBack,
}) => {
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [convertiendo, setConvertiendo] = useState(false);
  const [mensajeExito, setMensajeExito] = useState('');

  // Creador rápido de etiquetas
  const [crearTagOpen, setCrearTagOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#2563EB');

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    try {
      await onCrearEtiqueta(newTagName.trim(), newTagColor);
      setNewTagName('');
      setCrearTagOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (conversacion) {
      setTelefono(conversacion.telefono || '');
      setEmail(conversacion.email || '');
      setNotas(conversacion.notas_internas || '');
      setMensajeExito('');
    }
  }, [conversacion]);

  if (!conversacion) return null;

  const handleSaveNotes = async () => {
    try {
      setGuardando(true);
      await tiktokService.guardarNotasContacto(conversacion.id, notas, telefono, email);
      setMensajeExito('Datos guardados correctamente');
      onUpdateConversacion();
      setTimeout(() => setMensajeExito(''), 3000);
    } catch (err) {
      console.error('Error al guardar datos:', err);
    } finally {
      setGuardando(false);
    }
  };

  const handleConvertirACliente = async () => {
    try {
      setConvertiendo(true);
      await tiktokService.convertirAClienteERP(conversacion, sucursalId);
      setMensajeExito('¡Lead vinculado a Clientes ERP!');
      onUpdateConversacion();
      setTimeout(() => setMensajeExito(''), 3000);
    } catch (err) {
      console.error('Error al convertir cliente:', err);
    } finally {
      setConvertiendo(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-white border-l border-slate-200 overflow-hidden">
      {/* Cabecera del Panel */}
      <div className="p-4 border-b border-slate-200 text-center shrink-0 bg-white relative">
        {onBack && (
          <button
            onClick={onBack}
            className="absolute top-4 left-4 p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-all cursor-pointer lg:hidden"
            title="Volver al chat"
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
          className="w-16 h-16 rounded-full object-cover mx-auto mb-2 border-2 border-white shadow-md"
        />
        <h3 className="font-semibold text-sm text-slate-900 leading-tight">{conversacion.nombre_contacto}</h3>
        {conversacion.username_contacto && (
          <p className="text-xs text-blue-600 font-medium mt-0.5">{conversacion.username_contacto}</p>
        )}
        <span className="inline-block mt-2 text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
          ID: {conversacion.tiktok_user_id}
        </span>
      </div>

      {/* Cuerpo scrolleable con Safe Area generoso */}
      <div className="p-4 space-y-4 flex-1 min-h-0 overflow-y-auto pb-[max(3rem,env(safe-area-inset-bottom))]">
        {/* Notificación de éxito */}
        {mensajeExito && (
          <div className="p-2.5 bg-emerald-50 text-emerald-700 text-xs rounded-lg border border-emerald-200 flex items-center gap-1.5 font-medium animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{mensajeExito}</span>
          </div>
        )}

        {/* Acción Convertir a Cliente ERP */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800">Estado de Cliente</span>
            {conversacion.cliente_id ? (
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Registrado
              </span>
            ) : (
              <span className="text-[10px] font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                Lead Nuevo
              </span>
            )}
          </div>

          {!conversacion.cliente_id ? (
            <button
              onClick={handleConvertirACliente}
              disabled={convertiendo}
              className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {convertiendo ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <UserCheck className="w-3.5 h-3.5" />
              )}
              <span>Convertir a Cliente ERP</span>
            </button>
          ) : (
            <p className="text-[11px] text-slate-500">
              Este contacto ya forma parte de tu base de clientes global de Aura ERP.
            </p>
          )}
        </div>

        {/* Asignación y Prioridad (Fase 1) */}
        <div className="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div>
            <label className="text-[11px] font-semibold text-slate-500 block mb-1">
              Prioridad de Atención
            </label>
            <div className="grid grid-cols-4 gap-1">
              {(['urgente', 'alta', 'normal', 'baja'] as const).map((p) => {
                const colors = {
                  urgente: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 active:bg-red-600 active:text-white',
                  alta: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 active:bg-amber-500 active:text-white',
                  normal: 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 active:bg-slate-600 active:text-white',
                  baja: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 active:bg-blue-600 active:text-white',
                };
                const activeColors = {
                  urgente: 'bg-red-600 text-white border-red-600 hover:bg-red-700',
                  alta: 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600',
                  normal: 'bg-slate-600 text-white border-slate-600 hover:bg-slate-700',
                  baja: 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700',
                };
                const isSelected = conversacion.prioridad === p;
                return (
                  <button
                    key={p}
                    onClick={() => onCambiarPrioridad(conversacion.id, p)}
                    className={`px-1 py-1 rounded text-[9px] font-bold uppercase border transition-all text-center cursor-pointer ${
                      isSelected ? activeColors[p] : colors[p]
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 block mb-1">
              Agente Asignado
            </label>
            <select
              value={conversacion.asignado_a || ''}
              onChange={(e) => onAsignarAgente(conversacion.id, e.target.value || null)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 text-slate-800"
            >
              <option value="">Sin Asignar</option>
              {agentes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre} ({a.rol === 'admin' ? 'Admin' : 'Cajero'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Gestión de Etiquetas (Fase 1) */}
        <div className="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Etiquetas</span>
            <button
              onClick={() => setCrearTagOpen(!crearTagOpen)}
              className="text-[10px] text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
            >
              {crearTagOpen ? 'Cancelar' : '+ Nueva'}
            </button>
          </div>

          {/* Creador de Etiquetas */}
          {crearTagOpen && (
            <div className="space-y-2 p-2 bg-white rounded-lg border border-slate-200 animate-in fade-in">
              <input
                type="text"
                placeholder="Nombre etiqueta..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="w-full px-2 py-1 text-[11px] border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
              <div className="flex justify-between items-center gap-1">
                <div className="flex gap-1">
                  {['#2563EB', '#DC2626', '#D97706', '#059669', '#7C3AED'].map((col) => (
                    <button
                      key={col}
                      onClick={() => setNewTagColor(col)}
                      className={`w-4 h-4 rounded-full border transition-all cursor-pointer ${
                        newTagColor === col ? 'ring-2 ring-blue-600 border-white' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
                <button
                  onClick={handleCreateTag}
                  disabled={!newTagName.trim()}
                  className="px-2 py-1 bg-blue-600 text-white rounded text-[10px] font-medium disabled:opacity-50 cursor-pointer"
                >
                  Crear
                </button>
              </div>
            </div>
          )}

          {/* Listado / Selección de Etiquetas */}
          <div className="flex flex-wrap gap-1">
            {etiquetasConfig.map((tag) => {
              const isLinked = (conversacion.etiquetas || []).some((t) => t.id === tag.id);
              return (
                <button
                  key={tag.id}
                  onClick={() =>
                    isLinked
                      ? onDesvincularEtiqueta(conversacion.id, tag.id)
                      : onVincularEtiqueta(conversacion.id, tag.id)
                  }
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all border cursor-pointer ${
                    isLinked
                      ? 'text-white border-transparent'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                  style={{
                    backgroundColor: isLinked ? tag.color : undefined,
                    borderColor: !isLinked ? undefined : 'transparent',
                  }}
                >
                  {tag.nombre} {isLinked ? '✓' : ''}
                </button>
              );
            })}
            {etiquetasConfig.length === 0 && (
              <span className="text-[10px] text-slate-400 italic">No hay etiquetas configuradas.</span>
            )}
          </div>
        </div>

        {/* Datos Complementarios */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Datos de Contacto
          </h4>

          <div className="space-y-2">
            <div>
              <label className="text-[11px] text-slate-500 flex items-center gap-1 mb-1 font-medium">
                <Phone className="w-3 h-3 text-slate-400" /> Teléfono
              </label>
              <input
                type="text"
                placeholder="+51 987654321"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white text-slate-800 transition-colors"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-500 flex items-center gap-1 mb-1 font-medium">
                <Mail className="w-3 h-3 text-slate-400" /> Correo Electrónico
              </label>
              <input
                type="email"
                placeholder="cliente@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white text-slate-800 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Notas Internas del Asesor */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-900 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-slate-400" /> Notas del Asesor
          </label>
          <textarea
            rows={3}
            placeholder="Ej. Interesado en servicio VIP, prefiere atención los sábados..."
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white text-slate-800 resize-none transition-colors"
          />
          <button
            onClick={handleSaveNotes}
            disabled={guardando}
            className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {guardando ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>Guardar Datos</span>
          </button>
        </div>

        {/* Enlace externo */}
        {conversacion.username_contacto && (
          <a
            href={`https://www.tiktok.com/${conversacion.username_contacto}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 py-2.5 transition-colors border-t border-slate-100 font-medium"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-500" />
            <span>Ver perfil en TikTok</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
};
