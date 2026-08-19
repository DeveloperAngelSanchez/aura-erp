import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../api/supabaseClient';
import { tiktokService } from '../services/tiktokService';
import type { CRMConversacion, CRMMensaje, FiltroEstadoCRM, CRMEtiqueta, CRMRespuestaRapida, PrioridadConversacion } from '../types/crm';

export function useTikTokChat(empresaId: string | null) {
  const [conversaciones, setConversaciones] = useState<CRMConversacion[]>([]);
  const [conversacionActiva, setConversacionActiva] = useState<CRMConversacion | null>(null);
  const [mensajes, setMensajes] = useState<CRMMensaje[]>([]);
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstadoCRM>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [cargandoMensajes, setCargandoMensajes] = useState(false);

  // Estados adicionales de gestión empresarial (Fase 1)
  const [etiquetasConfig, setEtiquetasConfig] = useState<CRMEtiqueta[]>([]);
  const [respuestasRapidas, setRespuestasRapidas] = useState<CRMRespuestaRapida[]>([]);
  const [agentes, setAgentes] = useState<{ id: string; nombre: string; rol: string }[]>([]);

  // Cargar lista de conversaciones
  const cargarConversaciones = useCallback(async () => {
    if (!empresaId) return;
    try {
      setLoading(true);
      const data = await tiktokService.fetchConversaciones(empresaId, filtroEstado, busqueda);
      setConversaciones(data);
      
      // Actualizar también la conversación activa en pantalla si cambia
      if (conversacionActiva) {
        const actualizada = data.find((c) => c.id === conversacionActiva.id);
        if (actualizada) setConversacionActiva(actualizada);
      }
    } catch (err) {
      console.error('Error al cargar conversaciones CRM:', err);
    } finally {
      setLoading(false);
    }
  }, [empresaId, filtroEstado, busqueda, conversacionActiva]);

  // Cargar configuraciones iniciales de la empresa (etiquetas, respuestas rápidas, agentes)
  const cargarConfiguracionesCrm = useCallback(async () => {
    if (!empresaId) return;
    try {
      const [etiquetasData, respuestasData, agentesData] = await Promise.all([
        tiktokService.fetchEtiquetas(empresaId),
        tiktokService.fetchRespuestasRapidas(empresaId),
        tiktokService.fetchAgentes(empresaId),
      ]);
      setEtiquetasConfig(etiquetasData);
      setRespuestasRapidas(respuestasData);
      setAgentes(agentesData);
    } catch (err) {
      console.error('Error al cargar configuraciones CRM:', err);
    }
  }, [empresaId]);

  // Cargar lista de conversaciones y configuraciones al cambiar filtros o iniciar
  useEffect(() => {
    cargarConversaciones();
  }, [filtroEstado, busqueda]);

  useEffect(() => {
    cargarConfiguracionesCrm();
  }, [cargarConfiguracionesCrm]);

  // Cargar mensajes de la conversación activa
  const cargarMensajesConversacion = useCallback(async (convId: string) => {
    try {
      setCargandoMensajes(true);
      const data = await tiktokService.fetchMensajes(convId);
      setMensajes(data);
      // Marcar como leídos en la base de datos
      await tiktokService.marcarComoLeido(convId);
      // Actualizar contador local de no leídos
      setConversaciones((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, no_leidos: 0 } : c))
      );
    } catch (err) {
      console.error('Error al cargar mensajes:', err);
    } finally {
      setCargandoMensajes(false);
    }
  }, []);

  // Seleccionar una conversación
  const seleccionarConversacion = (conv: CRMConversacion) => {
    setConversacionActiva(conv);
    cargarMensajesConversacion(conv.id);
  };

  // Suscripción en Tiempo Real con Supabase Realtime
  useEffect(() => {
    if (!empresaId) return;

    // Escuchar nuevos mensajes entrantes o salientes
    const canalMensajes = supabase
      .channel('realtime_crm_mensajes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'crm_mensajes' },
        (payload) => {
          const nuevoMensaje = payload.new as CRMMensaje;

          // Si el nuevo mensaje pertenece a la conversación actualmente abierta en pantalla
          if (conversacionActiva && nuevoMensaje.conversacion_id === conversacionActiva.id) {
            setMensajes((prev) => {
              if (prev.some((m) => m.id === nuevoMensaje.id)) return prev;
              return [...prev, nuevoMensaje];
            });
            // Marcar como leído
            tiktokService.marcarComoLeido(conversacionActiva.id);
          }

          // Refrescar lista de conversaciones para actualizar la vista previa del último mensaje
          cargarConversaciones();
        }
      )
      .subscribe();

    // Escuchar cambios en conversaciones (ej. cambio de estado o nuevo último mensaje)
    const canalConversaciones = supabase
      .channel('realtime_crm_conversaciones')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crm_conversaciones' },
        () => {
          cargarConversaciones();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canalMensajes);
      supabase.removeChannel(canalConversaciones);
    };
  }, [empresaId, conversacionActiva, cargarConversaciones]);

  // Enviar mensaje
  const enviarMensaje = async (contenido: string, usuarioId?: string) => {
    if (!conversacionActiva || !contenido.trim()) return;

    try {
      const nuevoMsg = await tiktokService.enviarMensaje(
        conversacionActiva.id,
        contenido,
        usuarioId
      );
      setMensajes((prev) => [...prev, nuevoMsg]);
      cargarConversaciones();
    } catch (err) {
      console.error('Error al enviar mensaje:', err);
      throw err;
    }
  };

  // Asignar agente
  const asignarAgente = async (convId: string, agenteId: string | null) => {
    try {
      await tiktokService.asignarAgente(convId, agenteId);
      if (conversacionActiva && conversacionActiva.id === convId) {
        setConversacionActiva((prev) => prev ? { ...prev, asignado_a: agenteId || undefined } : null);
      }
      cargarConversaciones();
    } catch (err) {
      console.error('Error al asignar agente:', err);
    }
  };

  // Cambiar prioridad
  const cambiarPrioridad = async (convId: string, prioridad: PrioridadConversacion) => {
    try {
      await tiktokService.cambiarPrioridadConversacion(convId, prioridad);
      if (conversacionActiva && conversacionActiva.id === convId) {
        setConversacionActiva((prev) => prev ? { ...prev, prioridad } : null);
      }
      cargarConversaciones();
    } catch (err) {
      console.error('Error al cambiar prioridad:', err);
    }
  };

  // Vincular etiqueta
  const vincularEtiqueta = async (convId: string, etiquetaId: string) => {
    try {
      await tiktokService.vincularEtiqueta(convId, etiquetaId);
      cargarConversaciones();
    } catch (err) {
      console.error('Error al vincular etiqueta:', err);
    }
  };

  // Desvincular etiqueta
  const desvincularEtiqueta = async (convId: string, etiquetaId: string) => {
    try {
      await tiktokService.desvincularEtiqueta(convId, etiquetaId);
      cargarConversaciones();
    } catch (err) {
      console.error('Error al desvincular etiqueta:', err);
    }
  };

  // Crear etiqueta
  const crearEtiqueta = async (nombre: string, color: string) => {
    if (!empresaId) return;
    try {
      const nueva = await tiktokService.crearEtiqueta(empresaId, nombre, color);
      setEtiquetasConfig((prev) => [...prev, nueva]);
      return nueva;
    } catch (err) {
      console.error('Error al crear etiqueta:', err);
    }
  };

  // Guardar respuestas rápidas
  const guardarRespuestaRapida = async (resp: Partial<CRMRespuestaRapida>) => {
    if (!empresaId) return;
    try {
      const guardada = await tiktokService.guardarRespuestaRapida({ ...resp, empresa_id: empresaId });
      setRespuestasRapidas((prev) => {
        const existe = prev.some((r) => r.id === guardada.id);
        if (existe) {
          return prev.map((r) => (r.id === guardada.id ? guardada : r));
        }
        return [...prev, guardada];
      });
      return guardada;
    } catch (err) {
      console.error('Error al guardar respuesta rápida:', err);
    }
  };

  // Eliminar respuesta rápida
  const eliminarRespuestaRapida = async (id: string) => {
    try {
      await tiktokService.eliminarRespuestaRapida(id);
      setRespuestasRapidas((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error('Error al eliminar respuesta rápida:', err);
    }
  };

  // Simular mensaje entrante (Sandbox)
  const simularMensaje = async () => {
    if (!empresaId) return;
    try {
      const nuevaConv = await tiktokService.simularMensajeEntrante(empresaId);
      await cargarConversaciones();
      seleccionarConversacion(nuevaConv);
    } catch (err) {
      console.error('Error al simular mensaje entrante:', err);
    }
  };

  return {
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
    refrescarConversaciones: cargarConversaciones,
    setConversacionActiva,
    // Fase 1 variables y métodos expuestos
    etiquetasConfig,
    respuestasRapidas,
    agentes,
    asignarAgente,
    cambiarPrioridad,
    vincularEtiqueta,
    desvincularEtiqueta,
    crearEtiqueta,
    guardarRespuestaRapida,
    eliminarRespuestaRapida,
  };
}
