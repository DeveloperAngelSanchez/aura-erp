import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../api/supabaseClient';
import { useAuth } from './AuthContext';

type PermissionMap = Record<string, boolean>;

interface PermissionsContextType {
  permissions: PermissionMap;
  loading: boolean;
  can: (permiso: string) => boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

const DEFAULT_ADMIN_PERMISSIONS: PermissionMap = {
  ver_ventas: true,
  crear_venta: true,
  anular_venta: true,
  ver_historial_ventas: true,
  gestionar_usuarios: true,
  gestionar_catalogo: true,
  gestionar_inventario: true,
  gestionar_compras: true,
  ver_reportes: true,
  gestionar_configuracion: true,
  registrar_movimiento_caja: true,
  aprobar_movimiento_caja: true,
  ver_notificaciones_stock: true,
  gestionar_asistencia: true,
  ver_su_asistencia: true,
  gestionar_clientes: true,
};

const DEFAULT_CAJERO_PERMISSIONS: PermissionMap = {
  ver_ventas: true,
  crear_venta: true,
  ver_historial_ventas: true,
  ver_su_asistencia: true,
};

const DEFAULT_BARBERO_PERMISSIONS: PermissionMap = {
  ver_ventas: true,
  ver_su_asistencia: true,
};

function getDefaultsForRole(rol: string): PermissionMap {
  if (rol === 'admin' || rol === 'sistema_admin') return DEFAULT_ADMIN_PERMISSIONS;
  if (rol === 'cajero') return DEFAULT_CAJERO_PERMISSIONS;
  return DEFAULT_BARBERO_PERMISSIONS;
}

export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const [permissions, setPermissions] = useState<PermissionMap>({});
  const [loading, setLoading] = useState(true);

  const loadPermissions = async () => {
    setLoading(true);
    try {
      if (!profile) {
        setPermissions({});
        return;
      }

      const { data, error } = await supabase
        .from('permisos_usuario')
        .select('permiso, habilitado')
        .eq('usuario_id', profile.id);

      if (error) throw error;

      if (data && data.length > 0) {
        const map: PermissionMap = {};
        for (const row of data) {
          map[row.permiso] = row.habilitado;
        }
        setPermissions(map);
      } else {
        setPermissions(getDefaultsForRole(profile.rol));
      }
    } catch {
      setPermissions(getDefaultsForRole(profile?.rol || 'cajero'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPermissions();
  }, [profile?.id]);

  const can = (permiso: string): boolean => {
    if (profile?.rol_sistema === 'sistema_admin') return true;
    return permissions[permiso] === true;
  };

  return (
    <PermissionsContext.Provider
      value={{
        permissions,
        loading,
        can,
        refreshPermissions: loadPermissions,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = (): PermissionsContextType => {
  const ctx = useContext(PermissionsContext);
  if (!ctx) throw new Error('usePermissions must be used within a PermissionsProvider');
  return ctx;
};

export const usePermission = (permiso: string): boolean => {
  return usePermissions().can(permiso);
};