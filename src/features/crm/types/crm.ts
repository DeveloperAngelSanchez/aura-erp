export type EstadoConversacion = 'pendiente' | 'en_proceso' | 'cerrado';
export type DireccionMensaje = 'inbound' | 'outbound';
export type FiltroEstadoCRM = 'todos' | EstadoConversacion;
export type PrioridadConversacion = 'urgente' | 'alta' | 'normal' | 'baja';

export interface TikTokConfig {
  id?: string;
  empresa_id: string;
  tiktok_app_id?: string;
  tiktok_app_secret?: string;
  access_token?: string;
  refresh_token?: string;
  webhook_verify_token?: string;
  modo_sandbox: boolean;
  activo: boolean;
  creado_en?: string;
  actualizado_en?: string;
}

export interface CRMEtiqueta {
  id: string;
  empresa_id: string;
  nombre: string;
  color: string;
  orden: number;
  creado_en?: string;
}

export interface CRMRespuestaRapida {
  id: string;
  empresa_id: string;
  titulo: string;
  contenido: string;
  categoria?: string;
  atajo?: string;
  orden: number;
  activo: boolean;
  creado_en?: string;
}

export interface CRMConversacion {
  id: string;
  empresa_id: string;
  tiktok_user_id: string;
  nombre_contacto: string;
  username_contacto?: string;
  avatar_url?: string;
  telefono?: string;
  email?: string;
  estado: EstadoConversacion;
  no_leidos: number;
  ultimo_mensaje?: string;
  ultimo_mensaje_at: string;
  asignado_a?: string;
  cliente_id?: string;
  notas_internas?: string;
  prioridad: PrioridadConversacion;
  creado_en: string;
  actualizado_en: string;
  // Campos enriquecidos en frontend
  etiquetas?: CRMEtiqueta[];
}

export interface CRMMensaje {
  id: string;
  conversacion_id: string;
  direccion: DireccionMensaje;
  contenido: string;
  tiktok_message_id?: string;
  leido: boolean;
  enviado_por?: string;
  creado_en: string;
}
