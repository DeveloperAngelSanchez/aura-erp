import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '../api/supabaseClient';
import { useAuth } from './AuthContext';

export interface Empresa {
  id: string;
  nombre: string;
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
  const [activeBranchIds, setActiveBranchIds] = useState<string[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loadingEmpresas, setLoadingEmpresas] = useState(false);

  const isSystemAdmin = profile?.rol_sistema === 'sistema_admin';

  const setActiveEmpresa = useCallback(async (empresaId: string | null, empresaNombre?: string) => {
    if (!empresaId) {
      setActiveEmpresaId(null);
      setActiveEmpresaNombre(null);
      setActiveBranchIds([]);
      return;
    }

    setActiveEmpresaId(empresaId);
    setActiveEmpresaNombre(empresaNombre || null);

    try {
      const { data } = await supabase
        .from('sucursales')
        .select('id, nombre')
        .eq('empresa_id', empresaId);

      if (data) {
        setActiveBranchIds(data.map((s: SucursalBasica) => s.id));
      }
    } catch (err) {
      console.error('Error loading sucursales for empresa:', err);
      setActiveBranchIds([]);
    }
  }, []);

  const clearActiveEmpresa = useCallback(() => {
    setActiveEmpresaId(null);
    setActiveEmpresaNombre(null);
    setActiveBranchIds([]);
  }, []);

  const refreshEmpresas = useCallback(async () => {
    if (!isSystemAdmin) return;
    setLoadingEmpresas(true);
    try {
      const { data } = await supabase
        .from('empresas')
        .select('id, nombre, activa, logo_url')
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

  const impersonating = isSystemAdmin && activeEmpresaId !== null;

  return (
    <EmpresaContext.Provider value={{
      activeEmpresaId,
      activeEmpresaNombre,
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
