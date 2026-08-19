import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '../api/supabaseClient';
import { useAuth } from './AuthContext';
import type { BusinessRubro, RubroConfig } from '../config/rubrosConfig';
import { getRubroConfig } from '../config/rubrosConfig';

export interface Empresa {
  id: string;
  nombre: string;
  rubro: BusinessRubro;
  activa: boolean;
  logo_url?: string | null;
}

interface SucursalBasica {
  id: string;
  nombre: string;
}

interface EmpresaContextType {
  activeEmpresaId: string | null;
  activeEmpresaNombre: string | null;
  activeRubro: BusinessRubro;
  rubroConfig: RubroConfig;
  activeBranchIds: string[];
  impersonating: boolean;
  empresas: Empresa[];
  loadingEmpresas: boolean;
  setActiveEmpresa: (empresaId: string | null, empresaNombre?: string) => Promise<void>;
  clearActiveEmpresa: () => void;
  refreshEmpresas: () => Promise<void>;
}

const EmpresaContext = createContext<EmpresaContextType | undefined>(undefined);

export const EmpresaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const [activeEmpresaId, setActiveEmpresaId] = useState<string | null>(null);
  const [activeEmpresaNombre, setActiveEmpresaNombre] = useState<string | null>(null);
  const [activeRubro, setActiveRubro] = useState<BusinessRubro>('barberia');
  const [activeBranchIds, setActiveBranchIds] = useState<string[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loadingEmpresas, setLoadingEmpresas] = useState(false);

  const isSystemAdmin = profile?.rol_sistema === 'sistema_admin';

  const setActiveEmpresa = useCallback(async (empresaId: string | null, empresaNombre?: string) => {
    if (!empresaId) {
      setActiveEmpresaId(null);
      setActiveEmpresaNombre(null);
      setActiveRubro('barberia');
      setActiveBranchIds([]);
      return;
    }

    setActiveEmpresaId(empresaId);
    setActiveEmpresaNombre(empresaNombre || null);

    try {
      const [sucursalesRes, empresaRes] = await Promise.all([
        supabase.from('sucursales').select('id, nombre').eq('empresa_id', empresaId),
        supabase.from('empresas').select('rubro').eq('id', empresaId).single()
      ]);

      if (sucursalesRes.data) {
        setActiveBranchIds(sucursalesRes.data.map((s: SucursalBasica) => s.id));
      }
      if (empresaRes.data?.rubro) {
        setActiveRubro(empresaRes.data.rubro as BusinessRubro);
      } else {
        setActiveRubro('barberia');
      }
    } catch (err) {
      console.error('Error loading sucursales/rubro for empresa:', err);
      setActiveBranchIds([]);
      setActiveRubro('barberia');
    }
  }, []);

  const clearActiveEmpresa = useCallback(() => {
    setActiveEmpresaId(null);
    setActiveEmpresaNombre(null);
    setActiveRubro('barberia');
    setActiveBranchIds([]);
  }, []);

  const refreshEmpresas = useCallback(async () => {
    if (!isSystemAdmin) return;
    setLoadingEmpresas(true);
    try {
      const { data } = await supabase
        .from('empresas')
        .select('id, nombre, rubro, activa, logo_url')
        .order('nombre', { ascending: true });

      if (data) {
        setEmpresas(data as Empresa[]);
      }
    } catch (err) {
      console.error('Error loading empresas:', err);
    } finally {
      setLoadingEmpresas(false);
    }
  }, [isSystemAdmin]);

  useEffect(() => {
    if (isSystemAdmin) {
      refreshEmpresas();
    }
  }, [isSystemAdmin, refreshEmpresas]);

  // Si el usuario normal no es admin de sistema, cargar empresa_id, nombre, sucursales y rubro de su empresa
  useEffect(() => {
    if (!isSystemAdmin && profile?.sucursal_id) {
      supabase
        .from('sucursales')
        .select('id, empresa_id, empresas(id, nombre, rubro)')
        .eq('id', profile.sucursal_id)
        .single()
        .then(({ data }) => {
          if (data) {
            if (data.empresa_id) {
              setActiveEmpresaId(data.empresa_id);
              setActiveBranchIds([data.id]);
            }
            const emp = data.empresas as any;
            if (emp?.nombre) {
              setActiveEmpresaNombre(emp.nombre);
            }
            if (emp?.rubro) {
              setActiveRubro(emp.rubro as BusinessRubro);
            }
          }
        });
    }
  }, [isSystemAdmin, profile?.sucursal_id]);

  const impersonating = isSystemAdmin && activeEmpresaId !== null;
  const rubroConfig = getRubroConfig(activeRubro);

  return (
    <EmpresaContext.Provider value={{
      activeEmpresaId,
      activeEmpresaNombre,
      activeRubro,
      rubroConfig,
      activeBranchIds,
      impersonating,
      empresas,
      loadingEmpresas,
      setActiveEmpresa,
      clearActiveEmpresa,
      refreshEmpresas,
    }}>
      {children}
    </EmpresaContext.Provider>
  );
};

export const useEmpresa = () => {
  const context = useContext(EmpresaContext);
  if (context === undefined) {
    throw new Error('useEmpresa must be used within an EmpresaProvider');
  }
  return context;
};
