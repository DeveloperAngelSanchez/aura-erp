import { supabase } from '../../../api/supabaseClient';
import type {
  TikTokConfig,
  CRMConversacion,
  CRMMensaje,
  FiltroEstadoCRM,
  EstadoConversacion,
} from '../types/crm';

// Nombres de perfiles simulados para el Sandbox
const NOMBRES_SIMULADOS = [
  { nombre: 'Carlos Mendoza', username: '@carlosm_pe', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80', mensaje: 'Hola, ¿tienen disponibilidad para atención hoy por la tarde?' },
  { nombre: 'Valeria Ríos', username: '@valeria_style', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80', mensaje: 'Buenas noches, ¿cuáles son los precios de sus promociones de fin de semana?' },
  { nombre: 'Jorge Luis Paiva', username: '@jorgeluis.official', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=120&q=80', mensaje: 'Hola equipo Aura, vi su último video en TikTok y me interesa agendar una reserva.' },
  { nombre: 'Lucía Fernández', username: '@lu_fernandez', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=120&q=80', mensaje: '¿Aceptan tarjetas de crédito y Yape/Plin como medio de pago?' },
  { nombre: 'Mateo Salazar', username: '@mateo_vlogs', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80', mensaje: '¡Excelente atención! Quisiera consultar si venden productos de mantenimiento.' },
];

export const tiktokService = {
  /**
   * Obtiene la configuración de API de TikTok para la empresa
   */
  async fetchConfiguracion(empresaId: string): Promise<TikTokConfig | null> {
    try {
      const { data, error } = await supabase
        .from('crm_config_tiktok')
        .select('*')
        .eq('empresa_id', empresaId)
        .maybeSingle();

      if (error) throw error;
      return data as TikTokConfig | null;
    } catch (err) {
      console.warn('Configuración de TikTok no encontrada o error:', err);
      return null;
    }
  },

  /**
   * Guarda o actualiza la configuración de API de TikTok
   */
  async guardarConfiguracion(config: Partial<TikTokConfig> & { empresa_id: string }): Promise<TikTokConfig> {
    const { data, error } = await supabase
      .from('crm_config_tiktok')
      .upsert(
        {
          ...config,
          actualizado_en: new Date().toISOString(),
        },
        { onConflict: 'empresa_id' }
      )
      .select('*')
      .single();

    if (error) throw error;
    return data as TikTokConfig;
  },

  /**
   * Intercambia el código de autorización temporal de TikTok por tokens reales
   */
  async intercambiarCodigoOauth(empresaId: string, code: string): Promise<any> {
    const { data, error } = await supabase.functions.invoke('tiktok-oauth', {
      body: { code, empresa_id: empresaId },
    });

    if (error) throw error;
    return data;
  },

  /**
   * Obtiene la lista de conversaciones de la empresa
   */
  async fetchConversaciones(
    empresaId: string,
    filtroEstado: FiltroEstadoCRM = 'todos',
    busqueda: string = ''
  ): Promise<CRMConversacion[]> {
    let query = supabase
      .from('crm_conversaciones')
      .select('*, crm_conversacion_etiquetas(crm_etiquetas(*))')
      .eq('empresa_id', empresaId)
      .order('ultimo_mensaje_at', { ascending: false });

    if (filtroEstado !== 'todos') {
      query = query.eq('estado', filtroEstado);
    }

    if (busqueda.trim()) {
      const term = `%${busqueda.trim()}%`;
      query = query.or(`nombre_contacto.ilike.${term},username_contacto.ilike.${term},ultimo_mensaje.ilike.${term}`);
    }

    const { data, error } = await query;
    if (error) throw error;

    const mapped = (data || []).map((conv: any) => {
      const etiquetas = (conv.crm_conversacion_etiquetas || [])
        .map((ce: any) => ce.crm_etiquetas)
        .filter(Boolean);
      return {
        ...conv,
        etiquetas,
      };
    });

    return mapped as CRMConversacion[];
  },

  /**
   * Obtiene los mensajes de una conversación
   */
  async fetchMensajes(conversacionId: string): Promise<CRMMensaje[]> {
    const { data, error } = await supabase
      .from('crm_mensajes')
      .select('*')
      .eq('conversacion_id', conversacionId)
      .order('creado_en', { ascending: true });

    if (error) throw error;
    return (data || []) as CRMMensaje[];
  },

  /**
   * Envía un mensaje saliente (outbound) en una conversación
   */
  async enviarMensaje(
    conversacionId: string,
    contenido: string,
    enviadoPorId?: string
  ): Promise<CRMMensaje> {
    const now = new Date().toISOString();

    // 1. Insertar mensaje saliente
    const { data: mensaje, error: errMensaje } = await supabase
      .from('crm_mensajes')
      .insert({
        conversacion_id: conversacionId,
        direccion: 'outbound',
        contenido,
        leido: true,
        enviado_por: enviadoPorId || null,
        creado_en: now,
      })
      .select('*')
      .single();

    if (errMensaje) throw errMensaje;

    // 2. Actualizar último mensaje de la conversación y estado a 'en_proceso' si estaba pendiente
    const { error: errConv } = await supabase
      .from('crm_conversaciones')
      .update({
        ultimo_mensaje: contenido,
        ultimo_mensaje_at: now,
        actualizado_en: now,
      })
      .eq('id', conversacionId);

    if (errConv) console.error('Error al actualizar conversación:', errConv);

    return mensaje as CRMMensaje;
  },

  /**
   * Marca una conversación como leída (resetea no_leidos a 0)
   */
  async marcarComoLeido(conversacionId: string): Promise<void> {
    const { error: errConv } = await supabase
      .from('crm_conversaciones')
      .update({ no_leidos: 0 })
      .eq('id', conversacionId);

    if (errConv) throw errConv;

    // Marcar mensajes como leídos
    await supabase
      .from('crm_mensajes')
      .update({ leido: true })
      .eq('conversacion_id', conversacionId)
      .eq('direccion', 'inbound')
      .eq('leido', false);
  },

  /**
   * Cambia el estado de la conversación (pendiente | en_proceso | cerrado)
   */
  async cambiarEstadoConversacion(conversacionId: string, nuevoEstado: EstadoConversacion): Promise<void> {
    const { error } = await supabase
      .from('crm_conversaciones')
      .update({
        estado: nuevoEstado,
        actualizado_en: new Date().toISOString(),
      })
      .eq('id', conversacionId);

    if (error) throw error;
  },

  /**
   * Actualiza notas internas y datos de contacto de una conversación
   */
  async guardarNotasContacto(
    conversacionId: string,
    notas: string,
    telefono?: string,
    email?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('crm_conversaciones')
      .update({
        notas_internas: notas,
        telefono: telefono || null,
        email: email || null,
        actualizado_en: new Date().toISOString(),
      })
      .eq('id', conversacionId);

    if (error) throw error;
  },

  /**
   * Convierte un contacto de TikTok en un Cliente oficial de Aura ERP
   */
  async convertirAClienteERP(conversacion: CRMConversacion, sucursalId?: string | null): Promise<string> {
    // 1. Verificar si ya tiene cliente_id vinculado
    if (conversacion.cliente_id) {
      return conversacion.cliente_id;
    }

    // 2. Insertar nuevo registro en tabla clientes
    const { data: cliente, error: errCliente } = await supabase
      .from('clientes')
      .insert({
        nombre: conversacion.nombre_contacto,
        telefono: conversacion.telefono || 'Sin registrar (TikTok)',
        email: conversacion.email || null,
        direccion: null,
        sucursal_id: sucursalId || null,
      })
      .select('id')
      .single();

    if (errCliente) throw errCliente;

    // 3. Vincular cliente_id a la conversación
    await supabase
      .from('crm_conversaciones')
      .update({ cliente_id: cliente.id })
      .eq('id', conversacion.id);

    return cliente.id;
  },

  /**
   * Obtiene todas las etiquetas configuradas para la empresa
   */
  async fetchEtiquetas(empresaId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('crm_etiquetas')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('orden', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Crea una nueva etiqueta para la empresa
   */
  async crearEtiqueta(empresaId: string, nombre: string, color: string): Promise<any> {
    const { data, error } = await supabase
      .from('crm_etiquetas')
      .insert({ empresa_id: empresaId, nombre, color })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Vincula una etiqueta a una conversación
   */
  async vincularEtiqueta(conversacionId: string, etiquetaId: string): Promise<void> {
    const { error } = await supabase
      .from('crm_conversacion_etiquetas')
      .insert({ conversacion_id: conversacionId, etiqueta_id: etiquetaId });

    if (error && error.code !== '23505') throw error;
  },

  /**
   * Desvincula una etiqueta de una conversación
   */
  async desvincularEtiqueta(conversacionId: string, etiquetaId: string): Promise<void> {
    const { error } = await supabase
      .from('crm_conversacion_etiquetas')
      .delete()
      .eq('conversacion_id', conversacionId)
      .eq('etiqueta_id', etiquetaId);

    if (error) throw error;
  },

  /**
   * Cambia la prioridad de una conversación
   */
  async cambiarPrioridadConversacion(conversacionId: string, nuevaPrioridad: string): Promise<void> {
    const { error } = await supabase
      .from('crm_conversaciones')
      .update({ prioridad: nuevaPrioridad, actualizado_en: new Date().toISOString() })
      .eq('id', conversacionId);

    if (error) throw error;
  },

  /**
   * Obtiene todos los perfiles de agentes activos para la empresa
   */
  async fetchAgentes(empresaId: string): Promise<{ id: string; nombre: string; rol: string }[]> {
    const { data, error } = await supabase
      .from('perfiles')
      .select('id, nombre, rol, sucursal_id, sucursales!inner(empresa_id)')
      .eq('sucursales.empresa_id', empresaId);

    if (error) throw error;
    return (data || []).map((p: any) => ({
      id: p.id,
      nombre: p.nombre,
      rol: p.rol,
    }));
  },

  /**
   * Asigna un agente a una conversación
   */
  async asignarAgente(conversacionId: string, agenteId: string | null): Promise<void> {
    const { error } = await supabase
      .from('crm_conversaciones')
      .update({ asignado_a: agenteId, actualizado_en: new Date().toISOString() })
      .eq('id', conversacionId);

    if (error) throw error;
  },

  /**
   * Obtiene todas las respuestas rápidas de la empresa
   */
  async fetchRespuestasRapidas(empresaId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('crm_respuestas_rapidas')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('activo', true)
      .order('orden', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Guarda o actualiza una respuesta rápida
   */
  async guardarRespuestaRapida(respuesta: any): Promise<any> {
    const { data, error } = await supabase
      .from('crm_respuestas_rapidas')
      .upsert({
        ...respuesta,
        creado_en: respuesta.id ? undefined : new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Elimina una respuesta rápida
   */
  async eliminarRespuestaRapida(id: string): Promise<void> {
    const { error } = await supabase
      .from('crm_respuestas_rapidas')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Genera una conversación y un mensaje simulado entrante (Modo Sandbox)
   */
  async simularMensajeEntrante(empresaId: string): Promise<CRMConversacion> {
    const randomProfile = NOMBRES_SIMULADOS[Math.floor(Math.random() * NOMBRES_SIMULADOS.length)];
    const mockTikTokUserId = `tk_usr_${Math.floor(100000 + Math.random() * 900000)}`;
    const now = new Date().toISOString();

    // 1. Crear conversación simulada
    const { data: conv, error: errConv } = await supabase
      .from('crm_conversaciones')
      .insert({
        empresa_id: empresaId,
        tiktok_user_id: mockTikTokUserId,
        nombre_contacto: randomProfile.nombre,
        username_contacto: randomProfile.username,
        avatar_url: randomProfile.avatar,
        estado: 'pendiente',
        no_leidos: 1,
        ultimo_mensaje: randomProfile.mensaje,
        ultimo_mensaje_at: now,
        creado_en: now,
        actualizado_en: now,
      })
      .select('*')
      .single();

    if (errConv) throw errConv;

    // 2. Crear primer mensaje entrante
    const { error: errMsg } = await supabase.from('crm_mensajes').insert({
      conversacion_id: conv.id,
      direccion: 'inbound',
      contenido: randomProfile.mensaje,
      leido: false,
      creado_en: now,
    });

    if (errMsg) throw errMsg;

    return conv as CRMConversacion;
  },
};
