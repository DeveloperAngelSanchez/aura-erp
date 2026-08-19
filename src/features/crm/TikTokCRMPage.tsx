import React, { useState, useEffect } from 'react';
import { supabase } from '../../api/supabaseClient';
import { useEmpresa } from '../../context/EmpresaContext';
import { useAuth } from '../../context/AuthContext';
import { useTikTokChat } from './hooks/useTikTokChat';
import { ChatList } from './components/ChatList';
import { ChatWindow } from './components/ChatWindow';
import { ContactDetailPanel } from './components/ContactDetailPanel';
import { TikTokConfigModal } from './components/TikTokConfigModal';
import { Settings, Sparkles, MessageSquare, Loader2, Building2, CheckCircle2, AlertCircle } from 'lucide-react';

export const TikTokCRMPage: React.FC = () => {
  const { activeEmpresaId, activeBranchIds } = useEmpresa();
  const { user, profile } = useAuth();
  const [empresaId, setEmpresaId] = useState<string | null>(activeEmpresaId);
  const [sucursalId, setSucursalId] = useState<string | null>(
    activeBranchIds.length > 0 ? activeBranchIds[0] : profile?.sucursal_id || null
  );
  const [resolvingEmpresa, setResolvingEmpresa] = useState<boolean>(!activeEmpresaId);

  // Resolver empresaId dinámicamente si no está presente en el contexto
  useEffect(() => {
    if (activeEmpresaId) {
      setEmpresaId(activeEmpresaId);
      const branch = activeBranchIds.length > 0 ? activeBranchIds[0] : profile?.sucursal_id || null;
      setSucursalId(branch);
      setResolvingEmpresa(false);
      return;
    }

    if (profile?.sucursal_id) {
      setSucursalId(profile.sucursal_id);
      supabase
        .from('sucursales')
        .select('empresa_id')
        .eq('id', profile.sucursal_id)
        .single()
        .then(
          ({ data, error }) => {
            if (!error && data?.empresa_id) {
              setEmpresaId(data.empresa_id);
            }
            setResolvingEmpresa(false);
          },
          () => {
            setResolvingEmpresa(false);
          }
        );
    } else {
      setResolvingEmpresa(false);
    }
  }, [activeEmpresaId, activeBranchIds, profile?.sucursal_id]);

  const {
    conversaciones,
    conversacionActiva,
    mensajes,
    loading,
    cargandoMensajes,
    filtroEstado,
    setFiltroEstado,
    busqueda,
    setBusqueda,
    seleccionarConversacion,
    enviarMensaje,
    simularMensaje,
    refrescarConversaciones,
    setConversacionActiva,
    etiquetasConfig,
    respuestasRapidas,
    agentes,
    asignarAgente,
    cambiarPrioridad,
    vincularEtiqueta,
    desvincularEtiqueta,
    crearEtiqueta,
  } = useTikTokChat(empresaId);

  const [mostrarPanelDetalle, setMostrarPanelDetalle] = useState(true);
  const [modalConfigAbierto, setModalConfigAbierto] = useState(false);
  const [tabMobile, setTabMobile] = useState<'lista' | 'chat' | 'detalle'>('lista');

  // Estados de proceso de OAuth 2.0 (Fase 1)
  const [oauthStatus, setOauthStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [oauthMessage, setOauthMessage] = useState('');

  // Capturar e intercambiar código temporal OAuth en URL callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');

    const ejecutarIntercambioOAuth = async (authCode: string) => {
      try {
        setOauthStatus('loading');
        setOauthMessage('Intercambiando código de autorización con TikTok...');

        const { tiktokService } = await import('./services/tiktokService');
        const redirectUri = window.location.origin + '/crm/tiktok';
        await tiktokService.intercambiarCodigoOauth(empresaId!, authCode, redirectUri);

        setOauthStatus('success');
        setOauthMessage('¡Cuenta de TikTok conectada exitosamente!');
        refrescarConversaciones();

        // Limpiar parámetros de la URL
        const url = new URL(window.location.href);
        url.searchParams.delete('code');
        url.searchParams.delete('state');
        window.history.replaceState({}, '', url.toString());

        setTimeout(() => {
          setOauthStatus('idle');
          setOauthMessage('');
        }, 3000);
      } catch (err: any) {
        console.error(err);
        setOauthStatus('error');
        setOauthMessage(`Error al conectar con TikTok: ${err.message || 'Error desconocido'}`);
        setTimeout(() => {
          setOauthStatus('idle');
          setOauthMessage('');
        }, 5000);
      }
    };

    if (code && state && empresaId && state === empresaId && oauthStatus === 'idle') {
      ejecutarIntercambioOAuth(code);
    }
  }, [empresaId, oauthStatus, refrescarConversaciones]);

  const handleSelectConversacion = (conv: typeof conversacionActiva) => {
    if (conv) {
      seleccionarConversacion(conv);
      setTabMobile('chat');
    }
  };

  const handleEnviar = async (texto: string) => {
    await enviarMensaje(texto, user?.id);
  };

  const handleCambiarEstado = async (nuevoEstado: 'pendiente' | 'en_proceso' | 'cerrado') => {
    if (!conversacionActiva) return;
    try {
      const { tiktokService } = await import('./services/tiktokService');
      await tiktokService.cambiarEstadoConversacion(conversacionActiva.id, nuevoEstado);
      setConversacionActiva({ ...conversacionActiva, estado: nuevoEstado });
      refrescarConversaciones();
    } catch (err) {
      console.error('Error al cambiar estado:', err);
    }
  };

  if (resolvingEmpresa) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-slate-50 gap-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm font-medium text-slate-600">Cargando datos de la empresa...</p>
      </div>
    );
  }

  if (!empresaId) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-slate-50 gap-4 p-6 text-center">
        <div className="p-4 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 shadow-sm">
          <Building2 className="w-10 h-10" />
        </div>
        <div className="max-w-md">
          <h2 className="text-base font-bold text-slate-800">Empresa no asignada</h2>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            Tu usuario no tiene una empresa o sucursal activa vinculada. Si eres Administrador del Sistema, selecciona una empresa desde el Gestor de Empresas para ver su CRM.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-slate-50 overflow-hidden relative">
      {/* Overlay de Carga / Éxito de OAuth 2.0 */}
      {oauthStatus !== 'idle' && (
        <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl space-y-4 border border-slate-200">
            {oauthStatus === 'loading' && (
              <>
                <Loader2 className="w-12 h-12 mx-auto animate-spin text-blue-600" />
                <h3 className="font-semibold text-slate-800 text-sm">Conectando con TikTok</h3>
                <p className="text-xs text-slate-500">{oauthMessage}</p>
              </>
            )}
            {oauthStatus === 'success' && (
              <>
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100 shadow-sm animate-bounce">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-slate-800 text-sm">¡Conexión Exitosa!</h3>
                <p className="text-xs text-slate-500">{oauthMessage}</p>
              </>
            )}
            {oauthStatus === 'error' && (
              <>
                <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100 shadow-sm">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-slate-800 text-sm">Error de Conexión</h3>
                <p className="text-xs text-rose-600 font-medium">{oauthMessage}</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Barra Superior del Módulo CRM */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-slate-900 text-white">
            <MessageSquare className="w-4 h-4 text-teal-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm text-slate-900 leading-tight">CRM TikTok Direct</h1>
              <span className="text-[10px] font-semibold bg-gradient-to-r from-teal-500 to-emerald-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                <Sparkles className="w-2.5 h-2.5" /> Sandbox Activo
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Canal de mensajería empresarial TikTok para atención al cliente y captura de leads.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setModalConfigAbierto(true)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-200 shadow-sm"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Configurar API TikTok</span>
          </button>
        </div>
      </div>

      {/* Selector de Tabs para Móviles (< lg) */}
      {conversacionActiva && (
        <div className="lg:hidden flex bg-white border-b border-slate-200 text-xs font-medium pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))]">
          <button
            onClick={() => setTabMobile('lista')}
            className={`flex-1 py-2 text-center border-b-2 ${
              tabMobile === 'lista'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-500'
            }`}
          >
            Conversaciones
          </button>
          <button
            onClick={() => setTabMobile('chat')}
            className={`flex-1 py-2 text-center border-b-2 ${
              tabMobile === 'chat'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-500'
            }`}
          >
            Chat Activo
          </button>
          <button
            onClick={() => setTabMobile('detalle')}
            className={`flex-1 py-2 text-center border-b-2 ${
              tabMobile === 'detalle'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-500'
            }`}
          >
            Detalle Contacto
          </button>
        </div>
      )}

      {/* Layout Principal Desktop (3 Columnas) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Columna 1: Lista de Conversaciones */}
        <div
          className={`w-full lg:w-80 shrink-0 ${
            tabMobile === 'lista' ? 'block' : 'hidden lg:block'
          } h-full`}
        >
          <ChatList
            conversaciones={conversaciones}
            conversacionActivaId={conversacionActiva?.id}
            filtroEstado={filtroEstado}
            onSelectFiltro={setFiltroEstado}
            busqueda={busqueda}
            onSearchChange={setBusqueda}
            onSelectConversacion={handleSelectConversacion}
            onSimularMensaje={simularMensaje}
            loading={loading}
          />
        </div>

        {/* Columna 2: Ventana de Chat */}
        <div
          className={`flex-1 ${
            tabMobile === 'chat' ? 'block' : 'hidden lg:block'
          } h-full`}
        >
          <ChatWindow
            conversacion={conversacionActiva}
            mensajes={mensajes}
            cargandoMensajes={cargandoMensajes}
            onEnviarMensaje={handleEnviar}
            onCambiarEstado={handleCambiarEstado}
            onTogglePanelDetalle={() => {
              if (window.innerWidth < 1024) {
                setTabMobile('detalle');
              } else {
                setMostrarPanelDetalle(!mostrarPanelDetalle);
              }
            }}
            mostrarPanelDetalle={mostrarPanelDetalle}
            respuestasRapidas={respuestasRapidas}
            onBack={() => setTabMobile('lista')}
          />
        </div>

        {/* Columna 3: Detalle del Contacto */}
        {mostrarPanelDetalle && conversacionActiva && (
          <div
            className={`w-full lg:w-80 shrink-0 ${
              tabMobile === 'detalle' ? 'block' : 'hidden lg:block'
            } h-full`}
          >
            <ContactDetailPanel
              conversacion={conversacionActiva}
              empresaId={empresaId}
              sucursalId={sucursalId}
              onUpdateConversacion={refrescarConversaciones}
              etiquetasConfig={etiquetasConfig}
              agentes={agentes}
              onAsignarAgente={asignarAgente}
              onCambiarPrioridad={cambiarPrioridad}
              onVincularEtiqueta={vincularEtiqueta}
              onDesvincularEtiqueta={desvincularEtiqueta}
              onCrearEtiqueta={crearEtiqueta}
              onBack={() => setTabMobile('chat')}
            />
          </div>
        )}
      </div>

      {/* Modal de Configuración */}
      <TikTokConfigModal
        isOpen={modalConfigAbierto}
        onClose={() => setModalConfigAbierto(false)}
        empresaId={empresaId}
      />
    </div>
  );
};
