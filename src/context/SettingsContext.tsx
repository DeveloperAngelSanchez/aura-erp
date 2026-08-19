import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../api/supabaseClient';
import { useAuth } from './AuthContext';
import { useEmpresa } from './EmpresaContext';

export interface SucursalConfig {
  id?: string;
  sucursal_id: string;
  moneda_simbolo: string;
  moneda_decimales: number;
  impuesto_porcentaje: number;
  ticket_encabezado: string;
  ticket_pie: string;
  limite_efectivo_caja: number;
  ticket_correlativo_inicial: number;
  comision_barbero_default: number;
  metodos_pago: string[];
  metodos_pago_favoritos: string[];
  mesas_cantidad?: number;
  mesas_prefijo?: string;
  ticket_digital_activo: boolean;
  ticket_ancho: string;
  ticket_incluir_qr: boolean;
  ticket_serie_prefijo: string;
  updated_at?: string;
}

const DEFAULT_CONFIG: SucursalConfig = {
  sucursal_id: '',
  moneda_simbolo: '$',
  moneda_decimales: 2,
  impuesto_porcentaje: 0.00,
  ticket_encabezado: '',
  ticket_pie: '',
  limite_efectivo_caja: 500.00,
  ticket_correlativo_inicial: 1,
  comision_barbero_default: 0.00,
  metodos_pago: ['efectivo', 'tarjeta', 'transferencia'],
  metodos_pago_favoritos: ['efectivo', 'tarjeta', 'transferencia'],
  mesas_cantidad: 0,
  mesas_prefijo: 'MS',
  ticket_digital_activo: false,
  ticket_ancho: '80mm',
  ticket_incluir_qr: true,
  ticket_serie_prefijo: 'T001',
};

interface SettingsContextType {
  config: SucursalConfig;
  loading: boolean;
  formatMoney: (amount: number, customCurrency?: string) => string;
  refreshConfig: () => Promise<void>;
  updateConfig: (updates: Partial<SucursalConfig>) => Promise<boolean>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const { impersonating, activeBranchIds } = useEmpresa();
  const [config, setConfig] = useState<SucursalConfig>(() => {
    const cached = localStorage.getItem('aura_sucursal_config');
    if (cached) {
      try {
        return JSON.parse(cached) as SucursalConfig;
      } catch (e) {
        console.error('Error parsing cached sucursal config:', e);
      }
    }
    return DEFAULT_CONFIG;
  });
  const [loading, setLoading] = useState<boolean>(true);

  const fetchConfig = async (sucursalId: string) => {
    try {
      const { data, error } = await supabase
        .from('configuraciones')
        .select('*')
        .eq('sucursal_id', sucursalId)
        .single();

      if (error) {
        console.error('Error loading sucursal settings:', error.message);
      } else if (data) {
        const parsedConfig: SucursalConfig = {
          ...data,
          metodos_pago: Array.isArray(data.metodos_pago) ? data.metodos_pago : DEFAULT_CONFIG.metodos_pago,
          metodos_pago_favoritos: Array.isArray(data.metodos_pago_favoritos) ? data.metodos_pago_favoritos : DEFAULT_CONFIG.metodos_pago_favoritos,
        };
        setConfig(parsedConfig);
        localStorage.setItem('aura_sucursal_config', JSON.stringify(parsedConfig));
      }
    } catch (err) {
      console.error('Unexpected error loading settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshConfig = useCallback(async () => {
    const targetSucursalId = impersonating && activeBranchIds.length > 0
      ? activeBranchIds[0]
      : profile?.sucursal_id;

    if (targetSucursalId) {
      await fetchConfig(targetSucursalId);
    }
  }, [profile?.sucursal_id, impersonating, activeBranchIds]);

  const updateConfig = async (updates: Partial<SucursalConfig>): Promise<boolean> => {
    const targetSucursalId = impersonating && activeBranchIds.length > 0
      ? activeBranchIds[0]
      : profile?.sucursal_id;

    if (!targetSucursalId) return false;
    try {
      const { error } = await supabase
        .from('configuraciones')
        .update(updates)
        .eq('sucursal_id', targetSucursalId);

      if (error) {
        console.error('Error updating sucursal settings:', error.message);
        return false;
      }

      const updated = { ...config, ...updates };
      setConfig(updated);
      localStorage.setItem('aura_sucursal_config', JSON.stringify(updated));
      return true;
    } catch (err) {
      console.error('Unexpected error updating settings:', err);
      return false;
    }
  };

  useEffect(() => {
    const targetSucursalId = impersonating && activeBranchIds.length > 0
      ? activeBranchIds[0]
      : profile?.sucursal_id;

    if (targetSucursalId) {
      fetchConfig(targetSucursalId);
    } else {
      setLoading(false);
    }
  }, [profile, impersonating, activeBranchIds]);

  const formatMoney = (amount: number, customCurrency?: string): string => {
    const safeAmount = isNaN(amount) ? 0 : amount;
    const decimals = config.moneda_decimales;
    const formatted = safeAmount.toFixed(decimals);
    
    let symbol = customCurrency || config.moneda_simbolo;
    if (symbol === 'PEN') symbol = 'S/.';
    if (symbol === 'USD') symbol = '$';
    if (symbol === 'EUR') symbol = '€';
    
    return `${symbol} ${formatted}`;
  };

  return (
    <SettingsContext.Provider value={{ config, loading, formatMoney, refreshConfig, updateConfig }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
