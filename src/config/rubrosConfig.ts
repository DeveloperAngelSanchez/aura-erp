export type BusinessRubro = 'barberia' | 'restaurante' | 'general';
export type UserRole = 'admin' | 'cajero' | 'barbero' | 'mesero' | 'jefe' | 'asistente';

export interface RoleOption {
  id: UserRole;
  label: string;
  badgeStyle: string;
}

export interface RubroConfig {
  id: BusinessRubro;
  label: string;
  description: string;
  iconName: string;
  rolesDisponibles: RoleOption[];
  labels: {
    staffTitle: string;
    staffMember: string;
    staffMemberPlural: string;
    selectStaffPrompt: string;
    salesRoleHeader: string;
    attentionTabPrefix: string;
    newAttentionTitle: string;
    newAttentionPlaceholder: string;
    mesaPanelTitle?: string;
    mesaDefaultName?: string;
    backToMesas?: string;
  };
  features: {
    comisionesBarbero: boolean;
    gestionMesas: boolean;
  };
}

export const RUBROS_CONFIG: Record<BusinessRubro, RubroConfig> = {
  barberia: {
    id: 'barberia',
    label: 'Barbería / Peluquería',
    description: 'Gestión de citas, cortes, atención por barberos y comisiones por servicio.',
    iconName: 'Scissors',
    rolesDisponibles: [
      { id: 'admin', label: 'Administrador', badgeStyle: 'bg-blue-50 text-blue-700 border-blue-200' },
      { id: 'cajero', label: 'Cajero', badgeStyle: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      { id: 'barbero', label: 'Barbero', badgeStyle: 'bg-purple-50 text-purple-700 border-purple-200' },
    ],
    labels: {
      staffTitle: 'Barberos y Personal',
      staffMember: 'Barbero',
      staffMemberPlural: 'Barberos',
      selectStaffPrompt: 'Atendido por Barbero...',
      salesRoleHeader: 'Barbero',
      attentionTabPrefix: 'Atención',
      newAttentionTitle: 'Nueva Atención',
      newAttentionPlaceholder: 'Nombre del cliente...',
    },
    features: {
      comisionesBarbero: true,
      gestionMesas: false,
    },
  },
  restaurante: {
    id: 'restaurante',
    label: 'Restaurante / Cafetería',
    description: 'Gestión de comensales, comandes, atención por meseros, cocina y caja.',
    iconName: 'Utensils',
    rolesDisponibles: [
      { id: 'admin', label: 'Administrador', badgeStyle: 'bg-blue-50 text-blue-700 border-blue-200' },
      { id: 'cajero', label: 'Cajero', badgeStyle: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      { id: 'mesero', label: 'Mesero / Garzón', badgeStyle: 'bg-amber-50 text-amber-700 border-amber-200' },
      { id: 'jefe', label: 'Jefe de Sala / Cocina', badgeStyle: 'bg-rose-50 text-rose-700 border-rose-200' },
      { id: 'asistente', label: 'Asistente', badgeStyle: 'bg-slate-100 text-slate-700 border-slate-200' },
    ],
    labels: {
      staffTitle: 'Personal de Servicio y Cocina',
      staffMember: 'Mesero / Personal',
      staffMemberPlural: 'Personal de Servicio',
      selectStaffPrompt: 'Atendido por Mesero...',
      salesRoleHeader: 'Atendido por',
      attentionTabPrefix: 'Mesa',
      newAttentionTitle: 'Nueva Mesa / Comanda',
      newAttentionPlaceholder: 'Ej. Mesa 4, Llevar, Barra...',
      mesaPanelTitle: 'Salón de Mesas',
      mesaDefaultName: 'Mesa',
      backToMesas: 'Volver a Mesas',
    },
    features: {
      comisionesBarbero: false,
      gestionMesas: true,
    },
  },
  general: {
    id: 'general',
    label: 'Comercio General',
    description: 'Venta directa de productos y servicios sin roles específicos de atención.',
    iconName: 'Store',
    rolesDisponibles: [
      { id: 'admin', label: 'Administrador', badgeStyle: 'bg-blue-50 text-blue-700 border-blue-200' },
      { id: 'cajero', label: 'Cajero', badgeStyle: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      { id: 'asistente', label: 'Asistente', badgeStyle: 'bg-slate-100 text-slate-700 border-slate-200' },
    ],
    labels: {
      staffTitle: 'Personal Comercial',
      staffMember: 'Personal',
      staffMemberPlural: 'Personal',
      selectStaffPrompt: 'Atendido por...',
      salesRoleHeader: 'Vendedor',
      attentionTabPrefix: 'Pedido',
      newAttentionTitle: 'Nuevo Pedido',
      newAttentionPlaceholder: 'Cliente o nota del pedido...',
    },
    features: {
      comisionesBarbero: false,
      gestionMesas: false,
    },
  },
};

export const getRubroConfig = (rubro?: string | null): RubroConfig => {
  if (!rubro || !RUBROS_CONFIG[rubro as BusinessRubro]) {
    return RUBROS_CONFIG.barberia;
  }
  return RUBROS_CONFIG[rubro as BusinessRubro];
};
