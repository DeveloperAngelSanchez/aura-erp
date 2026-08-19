import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../api/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useEmpresa } from '../context/EmpresaContext';
import type { CartItem } from '../features/pos/CartPanel';

export interface Mesa {
  id: string;
  sucursal_id: string;
  nombre: string;
  estado: 'disponible' | 'ocupada' | 'pendiente';
  abierta_en: string | null;
  turno_id: string | null;
  mesero_id: string | null;
  cliente_nombre: string | null;
  cliente_id: string | null;
  cart_data: CartItem[];
  orden_visual: number;
  activa: boolean;
  creado_en?: string;
}

export function useMesas() {
  const { profile } = useAuth();
  const { impersonating, activeBranchIds } = useEmpresa();
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMesaId, setActiveMesaId] = useState<string | null>(null);

  const activeSucursalId = impersonating && activeBranchIds.length > 0
    ? activeBranchIds[0]
    : profile?.sucursal_id;

  // Ref to store pending cart update timer for debouncing
  const debounceTimerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const loadMesas = useCallback(async () => {
    if (!activeSucursalId) {
      setMesas([]);
      setLoading(false);
      return;
    }

    try {
      if (mesas.length === 0) {
        setLoading(true);
      }
      const { data, error } = await supabase
        .from('mesas')
        .select('*')
        .eq('sucursal_id', activeSucursalId)
        .eq('activa', true)
        .order('orden_visual', { ascending: true });

      if (error) throw error;

      const parsed: Mesa[] = (data || []).map((m: any) => ({
        ...m,
        cart_data: Array.isArray(m.cart_data) ? m.cart_data : [],
      }));

      setMesas(parsed);
    } catch (err) {
      console.error('Error cargando mesas:', err);
    } finally {
      setLoading(false);
    }
  }, [activeSucursalId]);

  useEffect(() => {
    loadMesas();
  }, [loadMesas]);

  const activeMesa = mesas.find(m => m.id === activeMesaId) || null;

  const abrirMesa = async (
    mesaId: string,
    turnoId: string,
    meseroId?: string,
    clienteNombre?: string,
    clienteId?: string
  ) => {
    const mesaActual = mesas.find(m => m.id === mesaId);
    if (!mesaActual) return;

    // Si ya está ocupada/pendiente no reiniciamos abierta_en
    const nuevaAbiertaEn = mesaActual.estado === 'disponible' ? new Date().toISOString() : mesaActual.abierta_en;

    const updates: Partial<Mesa> = {
      estado: 'ocupada',
      abierta_en: nuevaAbiertaEn,
      turno_id: turnoId,
      mesero_id: meseroId || mesaActual.mesero_id,
      cliente_nombre: clienteNombre ?? mesaActual.cliente_nombre,
      cliente_id: clienteId ?? mesaActual.cliente_id,
    };

    setMesas(prev => prev.map(m => m.id === mesaId ? { ...m, ...updates } : m));

    try {
      const { error } = await supabase
        .from('mesas')
        .update(updates)
        .eq('id', mesaId);

      if (error) throw error;
    } catch (err) {
      console.error('Error abriendo mesa:', err);
      await loadMesas();
    }
  };

  const cerrarMesa = async (mesaId: string) => {
    const updates = {
      estado: 'disponible' as const,
      abierta_en: null,
      turno_id: null,
      mesero_id: null,
      cliente_nombre: null,
      cliente_id: null,
      cart_data: [],
    };

    setMesas(prev => prev.map(m => m.id === mesaId ? { ...m, ...updates } : m));
    if (activeMesaId === mesaId) {
      setActiveMesaId(null);
    }

    try {
      const { error } = await supabase
        .from('mesas')
        .update(updates)
        .eq('id', mesaId);

      if (error) throw error;
    } catch (err) {
      console.error('Error cerrando mesa:', err);
      await loadMesas();
    }
  };

  const updateMesaCart = (mesaId: string, newCart: CartItem[]) => {
    // Immediate UI update
    setMesas(prev => prev.map(m => m.id === mesaId ? { ...m, cart_data: newCart } : m));

    // Debounced DB sync
    if (debounceTimerRef.current[mesaId]) {
      clearTimeout(debounceTimerRef.current[mesaId]);
    }

    debounceTimerRef.current[mesaId] = setTimeout(async () => {
      try {
        const { error } = await supabase
          .from('mesas')
          .update({ cart_data: newCart })
          .eq('id', mesaId);

        if (error) throw error;
      } catch (err) {
        console.error('Error guardando carrito de mesa:', err);
      }
    }, 400);
  };

  const cambiarEstadoMesa = async (mesaId: string, estado: 'disponible' | 'ocupada' | 'pendiente') => {
    setMesas(prev => prev.map(m => m.id === mesaId ? { ...m, estado } : m));

    try {
      const { error } = await supabase
        .from('mesas')
        .update({ estado })
        .eq('id', mesaId);

      if (error) throw error;
    } catch (err) {
      console.error('Error cambiando estado de mesa:', err);
      await loadMesas();
    }
  };

  return {
    mesas,
    loading,
    activeMesaId,
    activeMesa,
    loadMesas,
    abrirMesa,
    cerrarMesa,
    updateMesaCart,
    cambiarEstadoMesa,
    setActiveMesaId,
  };
}
