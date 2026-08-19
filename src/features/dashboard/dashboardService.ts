import { supabase } from '../../api/supabaseClient';

export interface DateRange {
  from: string;
  to: string;
}

function diffDays(start: Date, end: Date) {
  const a = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const b = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((b - a) / 86400000);
}

function keyOf(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function weekStart(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

interface SeriesRow {
  creado_en: string;
  total: number;
  comision_generada: number;
}

function buildSalesSeries(rows: SeriesRow[], start: Date, end: Date) {
  const totalDays = diffDays(start, end) + 1;
  const granularity: 'daily' | 'weekly' = totalDays > 35 ? 'weekly' : 'daily';

  const buckets: Record<string, { label: string; ingresos: number; comisiones: number }> = {};

  if (granularity === 'daily') {
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const key = keyOf(d);
      buckets[key] = {
        label: d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }),
        ingresos: 0,
        comisiones: 0,
      };
    }
  } else {
    let cursor = weekStart(start);
    const endWeek = weekStart(end);
    while (cursor.getTime() <= endWeek.getTime()) {
      const key = keyOf(cursor);
      buckets[key] = {
        label: cursor.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }),
        ingresos: 0,
        comisiones: 0,
      };
      cursor.setDate(cursor.getDate() + 7);
    }
  }

  rows.forEach((v) => {
    const d = new Date(v.creado_en);
    const key = granularity === 'daily' ? keyOf(d) : keyOf(weekStart(d));
    if (buckets[key]) {
      buckets[key].ingresos += parseFloat(String(v.total)) || 0;
      buckets[key].comisiones += parseFloat(String(v.comision_generada)) || 0;
    }
  });

  const entries = Object.keys(buckets)
    .sort()
    .map((k) => buckets[k]);

  const salesSeries = entries.map((e) => ({
    day: e.label,
    total: Math.round(e.ingresos * 100) / 100,
  }));

  const revenueVsCommissions = entries.map((e) => ({
    date: e.label,
    ingresos: Math.round(e.ingresos * 100) / 100,
    comisiones: Math.round(e.comisiones * 100) / 100,
  }));

  return { salesSeries, revenueVsCommissions, granularity };
}

export interface DashboardData {
  totalSales: number;
  salesCount: number;
  activeTurns: number;
  activeBarbers: number;
  avgTicket: number;
  lowStockCount: number;
  granularity: 'daily' | 'weekly';
  salesSeries: { day: string; total: number }[];
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

export async function loadDashboard(branchIds: string[], range: DateRange): Promise<DashboardData> {
  const start = new Date(`${range.from}T00:00:00`);
  const end = new Date(`${range.to}T23:59:59.999`);

  const [
    salesRes,
    turnsRes,
    barbersRes,
    lowStockRes,
    recentSalesRes,
    lowStockItemsRes,
  ] = await Promise.all([
    // Sales in range (id + total)
    supabase.from('ventas').select('id, total')
      .in('sucursal_id', branchIds)
      .gte('creado_en', start.toISOString())
      .lte('creado_en', end.toISOString())
      .eq('estado', 'completada'),

    // Active turns
    supabase.from('caja_turnos').select('id', { count: 'exact', head: true })
      .eq('estado', 'abierto')
      .in('sucursal_id', branchIds),

    // Total staff
    supabase.from('perfiles').select('id', { count: 'exact', head: true })
      .in('rol', ['barbero', 'mesero', 'cajero'])
      .in('sucursal_id', branchIds),

    // Low stock count
    supabase.from('vista_items_stock_bajo').select('id', { count: 'exact', head: true }),

    // Recent sales in range
    supabase.from('vista_reporte_ventas').select('id, correlativo, total, metodo_pago, creado_en, usuario_nombre, cliente_nombre')
      .in('sucursal_id', branchIds)
      .gte('creado_en', start.toISOString())
      .lte('creado_en', end.toISOString())
      .order('creado_en', { ascending: false })
      .limit(10),

    // Low stock items list
    supabase.from('vista_items_stock_bajo').select('nombre, stock_actual, stock_minimo')
      .order('stock_actual', { ascending: true })
      .limit(5),
  ]);

  const salesRows = (salesRes.data || []) as { id: string; total: number }[];
  const saleIds = salesRows.map((v) => v.id);
  const totalSales = salesRows.reduce((s, v) => s + parseFloat(String(v.total)), 0);
  const salesCount = salesRows.length;
  const avgTicket = salesCount > 0 ? totalSales / salesCount : 0;

  // Series for charts (sales per day/week within range)
  const seriesRes = await supabase
    .from('vista_reporte_ventas')
    .select('total, comision_generada, creado_en')
    .in('sucursal_id', branchIds)
    .gte('creado_en', start.toISOString())
    .lte('creado_en', end.toISOString())
    .order('creado_en', { ascending: true });
  const { salesSeries, revenueVsCommissions, granularity } = buildSalesSeries(
    (seriesRes.data || []) as SeriesRow[],
    start,
    end
  );

  // Payment methods & top services filtered by sales within range
  let paymentMethods: { name: string; value: number; color: string }[] = [];
  let topServices: { name: string; total: number; cantidad: number }[] = [];

  if (saleIds.length > 0) {
    const [paymentRes, detailRes] = await Promise.all([
      supabase.from('venta_pagos').select('metodo_pago, monto')
        .in('venta_id', saleIds),
      supabase.from('venta_detalles').select('item_id, cantidad')
        .in('venta_id', saleIds),
    ]);

    // Payment methods
    const methodMap: Record<string, number> = {};
    (paymentRes.data || []).forEach((v: any) => {
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
    paymentMethods = Object.entries(methodMap)
      .map(([name, value]) => ({
        name: methodLabels[name] || name,
        value,
        color: paymentColors[name] || '#94a3b8',
      }))
      .sort((a, b) => b.value - a.value);

    // Top services
    const itemIds = [...new Set((detailRes.data || []).map((v: any) => v.item_id))];
    const itemNameMap: Record<string, string> = {};
    if (itemIds.length > 0) {
      const itemNameRes = await supabase
        .from('items')
        .select('id, nombre')
        .in('id', itemIds);
      (itemNameRes.data || []).forEach((i: any) => {
        itemNameMap[i.id] = i.nombre;
      });
    }
    const itemCountMap: Record<string, { name: string; cantidad: number; total: number }> = {};
    (detailRes.data || []).forEach((v: any) => {
      if (!itemCountMap[v.item_id]) {
        itemCountMap[v.item_id] = {
          name: itemNameMap[v.item_id] || v.item_id,
          cantidad: 0,
          total: 0,
        };
      }
      itemCountMap[v.item_id].cantidad += v.cantidad;
    });
    topServices = Object.values(itemCountMap)
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);
  }

  return {
    totalSales,
    salesCount,
    activeTurns: turnsRes.count ?? 0,
    activeBarbers: barbersRes.count ?? 0,
    avgTicket,
    lowStockCount: lowStockRes.count ?? 0,
    granularity,
    salesSeries,
    paymentMethods,
    revenueVsCommissions,
    topServices,
    recentSales: (recentSalesRes.data || []).slice(0, 8),
    lowStockItems: (lowStockItemsRes.data || []) as any[],
  };
}
