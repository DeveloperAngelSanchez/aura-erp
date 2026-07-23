import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../api/supabaseClient';
import { useAuth } from './AuthContext';
import { useEmpresa } from './EmpresaContext';

export interface CajaTurno {
  id: string;
  sucursal_id: string;
  usuario_id: string;
  monto_apertura: number;
  monto_cierre_real: number | null;
  monto_cierre_esperado: number | null;
  diferencia_caja: number | null;
  estado: 'abierto' | 'cerrado';
  abierto_en: string;
  cerrado_en: string | null;
}

interface CashContextType {
  activeTurn: CajaTurno | null;
  loading: boolean;
  checkActiveTurn: () => Promise<CajaTurno | null>;
  openTurn: (montoApertura: number) => Promise<CajaTurno>;
  closeTurn: (montoCierreReal: number, montoCierreEsperado?: number) => Promise<CajaTurno>;
  recordMovement: (tipo: 'ingreso_manual' | 'egreso_manual', monto: number, motivo: string) => Promise<void>;
}

const CashContext = createContext<CashContextType | undefined>(undefined);

export const CashProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const { impersonating, activeBranchIds } = useEmpresa();
  const [activeTurn, setActiveTurn] = useState<CajaTurno | null>(null);
  const [loading, setLoading] = useState(true);

  const checkActiveTurn = async (): Promise<CajaTurno | null> => {
    if (!profile?.sucursal_id) {
      setActiveTurn(null);
      setLoading(false);
      return null;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('caja_turnos')
        .select('*')
        .in('sucursal_id', impersonating ? activeBranchIds : [profile.sucursal_id])
        .eq('estado', 'abierto')
        .maybeSingle();

      if (error) throw error;
      setActiveTurn(data as CajaTurno);
      return data as CajaTurno;
    } catch (err) {
      console.error('Error checking active cash shift:', err);
      setActiveTurn(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkActiveTurn();
  }, [profile?.sucursal_id]);

  const openTurn = async (montoApertura: number): Promise<CajaTurno> => {
    if (!profile?.sucursal_id || !profile?.id) {
      throw new Error('User profile or branch not loaded.');
    }

    try {
      const targetBranchId = impersonating && activeBranchIds.length > 0 ? activeBranchIds[0] : profile?.sucursal_id;
      const { data, error } = await supabase
        .from('caja_turnos')
        .insert({
          sucursal_id: targetBranchId,
          usuario_id: profile.id,
          monto_apertura: montoApertura,
          estado: 'abierto'
        })
        .select()
        .single();

      if (error) throw error;
      setActiveTurn(data as CajaTurno);
      return data as CajaTurno;
    } catch (err) {
      console.error('Error opening cash shift:', err);
      throw err;
    }
  };

  const closeTurn = async (montoCierreReal: number, montoCierreEsperado?: number): Promise<CajaTurno> => {
    if (!activeTurn) {
      throw new Error('No active cash shift to close.');
    }

    try {
      const updateData: any = {
        estado: 'cerrado',
        monto_cierre_real: montoCierreReal,
        cerrado_en: new Date().toISOString()
      };

      if (montoCierreEsperado !== undefined) {
        updateData.monto_cierre_esperado = montoCierreEsperado;
        updateData.diferencia_caja = montoCierreReal - montoCierreEsperado;
      }

      const { data, error } = await supabase
        .from('caja_turnos')
        .update(updateData)
        .eq('id', activeTurn.id)
        .select()
        .single();

      if (error) throw error;
      setActiveTurn(null);
      return data as CajaTurno;
    } catch (err) {
      console.error('Error closing cash shift:', err);
      throw err;
    }
  };

  const recordMovement = async (tipo: 'ingreso_manual' | 'egreso_manual', monto: number, motivo: string): Promise<void> => {
    if (!activeTurn) {
      throw new Error('No active cash shift to record movements.');
    }

    try {
      const { error } = await supabase
        .from('caja_movimientos')
        .insert({
          turno_id: activeTurn.id,
          tipo,
          monto,
          motivo
        });

      if (error) throw error;
    } catch (err) {
      console.error('Error recording cash movement:', err);
      throw err;
    }
  };

  return (
    <CashContext.Provider value={{ activeTurn, loading, checkActiveTurn, openTurn, closeTurn, recordMovement }}>
      {children}
    </CashContext.Provider>
  );
};

export const useCash = () => {
  const context = useContext(CashContext);
  if (context === undefined) {
    throw new Error('useCash must be used within a CashProvider');
  }
  return context;
};
