import { supabase } from '../../api/supabaseClient';

export interface VentaCuota {
  id: string;
  venta_id: string;
  sucursal_id: string;
  numero_cuota: number;
  monto: number;
  monto_pagado: number;
  fecha_vencimiento: string;
  estado: 'pendiente' | 'parcial' | 'pagada';
  creado_en: string;
}

export interface VentaAbono {
  id: string;
  venta_id: string;
  cuota_id: string | null;
  sucursal_id: string;
  turno_id: string | null;
  usuario_id: string;
  monto: number;
  metodo_pago: string;
  notas: string | null;
  creado_en: string;
  usuario_nombre?: string;
}

export interface CreditoVenta {
  id: string;
  correlativo: number | null;
  total: number;
  monto_pagado: number;
  saldo_pendiente: number;
  condicion_venta: 'contado' | 'credito';
  estado_pago: 'pagado' | 'parcial' | 'pendiente';
  estado: string;
  creado_en: string;
  sucursal_id: string;
  sucursal_nombre?: string;
  cliente_id: string | null;
  cliente_nombre: string | null;
  usuario_nombre?: string;
  moneda?: string;
  cuotas?: VentaCuota[];
  abonos?: VentaAbono[];
}

export interface RegistrarAbonoParams {
  ventaId: string;
  sucursalId: string;
  usuarioId: string;
  monto: number;
  metodoPago: string;
  turnoId?: string | null;
  cuotaId?: string | null;
  notas?: string | null;
}

export async function fetchCuentasPorCobrar(branchIds: string[], options?: {
  estado?: 'todos' | 'pendiente' | 'parcial' | 'pagado';
  search?: string;
}): Promise<CreditoVenta[]> {
  if (!branchIds || branchIds.length === 0) return [];

  let query = supabase
    .from('vista_reporte_ventas')
    .select(`
      id,
      correlativo,
      total,
      monto_pagado,
      saldo_pendiente,
      condicion_venta,
      estado_pago,
      estado,
      creado_en,
      sucursal_id,
      cliente_id,
      cliente_nombre,
      moneda,
      usuario_nombre,
      sucursal_nombre
    `)
    .in('sucursal_id', branchIds)
    .eq('condicion_venta', 'credito')
    .neq('estado', 'anulada')
    .order('creado_en', { ascending: false });

  if (options?.estado && options.estado !== 'todos') {
    query = query.eq('estado_pago', options.estado);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching cuentas por cobrar from vista_reporte_ventas:', error);
    // Fallback directo a tabla ventas si la vista aún no tiene las columnas
    const fallbackRes = await supabase
      .from('ventas')
      .select('id, correlativo, total, monto_pagado, saldo_pendiente, condicion_venta, estado_pago, estado, creado_en, sucursal_id, cliente_id, cliente_nombre, moneda')
      .in('sucursal_id', branchIds)
      .eq('condicion_venta', 'credito')
      .neq('estado', 'anulada')
      .order('creado_en', { ascending: false });
    
    if (fallbackRes.error) {
      console.error('Fallback error:', fallbackRes.error);
      return [];
    }

    return (fallbackRes.data || []).map((row: any) => ({
      id: row.id,
      correlativo: row.correlativo,
      total: parseFloat(String(row.total)) || 0,
      monto_pagado: parseFloat(String(row.monto_pagado)) || 0,
      saldo_pendiente: parseFloat(String(row.saldo_pendiente)) || 0,
      condicion_venta: row.condicion_venta || 'credito',
      estado_pago: row.estado_pago || 'pendiente',
      estado: row.estado,
      creado_en: row.creado_en,
      sucursal_id: row.sucursal_id,
      cliente_id: row.cliente_id,
      cliente_nombre: row.cliente_nombre,
      moneda: row.moneda,
    }));
  }

  const list: CreditoVenta[] = (data || []).map((row: any) => ({
    id: row.id,
    correlativo: row.correlativo,
    total: parseFloat(String(row.total)) || 0,
    monto_pagado: parseFloat(String(row.monto_pagado)) || 0,
    saldo_pendiente: parseFloat(String(row.saldo_pendiente)) || 0,
    condicion_venta: row.condicion_venta,
    estado_pago: row.estado_pago,
    estado: row.estado,
    creado_en: row.creado_en,
    sucursal_id: row.sucursal_id,
    sucursal_nombre: row.sucursal_nombre || undefined,
    cliente_id: row.cliente_id,
    cliente_nombre: row.cliente_nombre,
    usuario_nombre: row.usuario_nombre || undefined,
    moneda: row.moneda,
  }));

  if (options?.search && options.search.trim()) {
    const term = options.search.toLowerCase().trim();
    return list.filter((item) => {
      const matchCliente = item.cliente_nombre?.toLowerCase().includes(term);
      const matchCorrelativo = item.correlativo?.toString().includes(term);
      const matchId = item.id.toLowerCase().includes(term);
      return matchCliente || matchCorrelativo || matchId;
    });
  }

  return list;
}

export async function fetchDetalleCredito(ventaId: string): Promise<{
  cuotas: VentaCuota[];
  abonos: VentaAbono[];
}> {
  const [cuotasRes, abonosRes] = await Promise.all([
    supabase
      .from('venta_cuotas')
      .select('*')
      .eq('venta_id', ventaId)
      .order('numero_cuota', { ascending: true }),
    supabase
      .from('venta_abonos')
      .select(`
        *,
        perfiles:usuario_id (nombre)
      `)
      .eq('venta_id', ventaId)
      .order('creado_en', { ascending: false }),
  ]);

  if (cuotasRes.error) {
    console.error('Error fetching cuotas:', cuotasRes.error);
  }
  if (abonosRes.error) {
    console.error('Error fetching abonos:', abonosRes.error);
  }

  const cuotas: VentaCuota[] = (cuotasRes.data || []).map((c: any) => ({
    ...c,
    monto: parseFloat(String(c.monto)) || 0,
    monto_pagado: parseFloat(String(c.monto_pagado)) || 0,
  }));

  const abonos: VentaAbono[] = (abonosRes.data || []).map((a: any) => ({
    ...a,
    monto: parseFloat(String(a.monto)) || 0,
    usuario_nombre: a.perfiles?.nombre || undefined,
  }));

  return { cuotas, abonos };
}

export async function registrarAbono(params: RegistrarAbonoParams): Promise<{
  success: boolean;
  abono_id?: string;
  monto_abonado: number;
  saldo_pendiente: number;
  estado_pago: string;
}> {
  const { data, error } = await supabase.rpc('registrar_abono_credito', {
    p_venta_id: params.ventaId,
    p_sucursal_id: params.sucursalId,
    p_usuario_id: params.usuarioId,
    p_monto: params.monto,
    p_metodo_pago: params.metodoPago,
    p_turno_id: params.turnoId || null,
    p_cuota_id: params.cuotaId || null,
    p_notas: params.notas || null,
  });

  if (error) {
    console.error('Error al registrar abono:', error);
    throw error;
  }

  return data;
}
