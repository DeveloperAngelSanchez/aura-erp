import { supabase } from '../../api/supabaseClient';

function getDayRange(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { start: start.toISOString(), end: now.toISOString() };
}


function formatShortDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

export interface DashboardData {
  todaySales: number;
  monthSales: number;
  activeTurns: number;
  activeBarbers: number;
  avgTicket: number;
  lowStockCount: number;
  weeklySales: { day: string; fullDate: string; total: number }[];
  paymentMethods: { name: string; value: number; color: string }[];
  revenueVsCommissions: { date: string; ingresos: number; comisiones: number }[];
  topServices: { name: string; total: number; cantidad: number }[];
  recentSales: {
    id: string;
    correlativo: number | null;
    total: number;
    metodo_pago: string;
    creado_en: string;
    usuario_nombre: string;
    cliente_nombre: string | null;
  }[];
  lowStockItems: { nombre: string; stock_actual: number; stock_minimo: number }[];
}

export async function loadDashboard(branchIds: string[]): Promise<DashboardData> {
  const today = getDayRange(new Date());
  const month = getMonthRange();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const [
    todaySalesRes,
    monthSalesRes,
    turnsRes,
    barbersRes,
    avgTicketRes,
    lowStockRes,
    weeklySalesRes,
    paymentMethodsRes,
    recentSalesRes,
    lowStockItemsRes,
  ] = await Promise.all([
    // Today sales
    supabase.from('ventas').select('total')
      .in('sucursal_id', branchIds)
      .gte('creado_en', today.start)
      .lte('creado_en', today.end)
      .eq('estado', 'completada'),

    // Month sales
    supabase.from('ventas').select('total')
      .in('sucursal_id', branchIds)
      .gte('creado_en', month.start)
      .lte('creado_en', month.end)
      .eq('estado', 'completada'),

    // Active turns
    supabase.from('caja_turnos').select('id', { count: 'exact', head: true })
      .eq('estado', 'abierto')
      .in('sucursal_id', branchIds),

    // Total barbers
    supabase.from('perfiles').select('id', { count: 'exact', head: true })
      .eq('rol', 'barbero')
      .in('sucursal_id', branchIds),

    // Avg ticket today
    supabase.from('ventas').select('total')
      .in('sucursal_id', branchIds)
      .gte('creado_en', today.start)
      .lte('creado_en', today.end)
      .eq('estado', 'completada'),

    // Low stock count
    supabase.from('vista_items_stock_bajo').select('id', { count: 'exact', head: true }),

    // Weekly sales (last 7 days)
    supabase.from('ventas').select('total, creado_en')
      .in('sucursal_id', branchIds)
      .gte('creado_en', sevenDaysAgo.toISOString())
      .lte('creado_en', today.end)
      .eq('estado', 'completada')
      .order('creado_en', { ascending: true }),

    // Payment methods (this month)
    supabase.from('venta_pagos').select('metodo_pago, monto, venta_id')
      .gte('creado_en', month.start)
      .lte('creado_en', month.end),

    // Recent sales
    supabase.from('vista_reporte_ventas').select('id, correlativo, total, metodo_pago, creado_en, usuario_nombre, cliente_nombre')
      .in('sucursal_id', branchIds)
      .order('creado_en', { ascending: false })
      .limit(10),

    // Low stock items list
    supabase.from('vista_items_stock_bajo').select('nombre, stock_actual, stock_minimo')
      .order('stock_actual', { ascending: true })
      .limit(5),
  ]);

  // Process sales
  const todayTotal = (todaySalesRes.data || []).reduce((s: number, v: any) => s + parseFloat(v.total), 0);
  const monthTotal = (monthSalesRes.data || []).reduce((s: number, v: any) => s + parseFloat(v.total), 0);
  const todayCount = (avgTicketRes.data || []).length;
  const avgTicket = todayCount > 0 ? todayTotal / todayCount : 0;

  // Weekly sales
  const dailyMap: Record<string, { day: string; fullDate: string; total: number }> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('es-MX', { weekday: 'short' }).toUpperCase();
    dailyMap[key] = { day: dayName, fullDate: key, total: 0 };
  }
  (weeklySalesRes.data || []).forEach((v: any) => {
    const key = new Date(v.creado_en).toISOString().split('T')[0];
    if (dailyMap[key]) {
      dailyMap[key].total += parseFloat(v.total);
    }
  });
  const weeklySales = Object.values(dailyMap);

  // Payment methods
  const methodMap: Record<string, number> = {};
  (paymentMethodsRes.data || []).forEach((v: any) => {
    if (!methodMap[v.metodo_pago]) methodMap[v.metodo_pago] = 0;
    methodMap[v.metodo_pago] += parseFloat(v.monto);
  });
  const paymentColors: Record<string, string> = {
    efectivo: '#10b981',
    tarjeta: '#3b82f6',
    transferencia: '#8b5cf6',
    mixto: '#f59e0b',
  };
  const methodLabels: Record<string, string> = {
    efectivo: 'Efectivo',
    tarjeta: 'Tarjeta',
    transferencia: 'Transferencia',
    mixto: 'Mixto',
  };
  const paymentMethods = Object.entries(methodMap)
    .map(([name, value]) => ({
      name: methodLabels[name] || name,
      value,
      color: paymentColors[name] || '#94a3b8',
    }))
    .sort((a, b) => b.value - a.value);

  // Revenue vs Commissions (last 30 days)
  const thirtyDayMap: Record<string, { ingresos: number; comisiones: number }> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    thirtyDayMap[key] = { ingresos: 0, comisiones: 0 };
  }
  const thirtyDayRes = await supabase
    .from('vista_reporte_ventas')
    .select('total, comision_generada, creado_en')
    .in('sucursal_id', branchIds)
    .gte('creado_en', thirtyDaysAgo.toISOString())
    .lte('creado_en', today.end)
    .order('creado_en', { ascending: true });
  (thirtyDayRes.data || []).forEach((v: any) => {
    const key = new Date(v.creado_en).toISOString().split('T')[0];
    if (thirtyDayMap[key]) {
      thirtyDayMap[key].ingresos += parseFloat(v.total);
      thirtyDayMap[key].comisiones += parseFloat(v.comision_generada || 0);
    }
  });
  const revenueVsCommissions = Object.entries(thirtyDayMap).map(([date, val]) => ({
    date: formatShortDate(date),
    ingresos: Math.round(val.ingresos * 100) / 100,
    comisiones: Math.round(val.comisiones * 100) / 100,
  }));

  // Top services (this month)
  const topServicesRes = await supabase
    .from('venta_detalles')
    .select('item_id, cantidad, venta_id')
    .in('venta_id', (await supabase
      .from('ventas')
      .select('id')
      .in('sucursal_id', branchIds)
      .gte('creado_en', month.start)
      .lte('creado_en', month.end)
      .eq('estado', 'completada')
    ).data?.map(v => v.id) || []);
  const itemCountMap: Record<string, { name: string; cantidad: number; total: number }> = {};
  const itemNames = new Set(topServicesRes.data?.map(v => v.item_id) || []);
  const itemNameRes = await supabase
    .from('items')
    .select('id, nombre, precio_venta')
    .in('id', [...itemNames]);
  const itemNameMap: Record<string, { nombre: string; precio_venta: number }> = {};
  (itemNameRes.data || []).forEach((i: any) => {
    itemNameMap[i.id] = { nombre: i.nombre, precio_venta: parseFloat(i.precio_venta) };
  });
  (topServicesRes.data || []).forEach((v: any) => {
    if (!itemCountMap[v.item_id]) {
      itemCountMap[v.item_id] = {
        name: itemNameMap[v.item_id]?.nombre || v.item_id,
        cantidad: 0,
        total: 0,
      };
    }
    itemCountMap[v.item_id].cantidad += v.cantidad;
  });
  const topServices = Object.values(itemCountMap)
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 5);

  return {
    todaySales: todayTotal,
    monthSales: monthTotal,
    activeTurns: turnsRes.count ?? 0,
    activeBarbers: barbersRes.count ?? 0,
    avgTicket,
    lowStockCount: lowStockRes.count ?? 0,
    weeklySales,
    paymentMethods,
    revenueVsCommissions,
    topServices,
    recentSales: (recentSalesRes.data || []).slice(0, 8) as any[],
    lowStockItems: (lowStockItemsRes.data || []) as any[],
  };
}
