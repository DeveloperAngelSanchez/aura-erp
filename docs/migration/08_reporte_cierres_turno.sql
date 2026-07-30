-- =============================================================
-- Migración 08: Vista de Reporte de Cierres de Turno
-- =============================================================

CREATE OR REPLACE VIEW public.vista_reporte_cierres_turno
WITH (security_invoker = true)
AS
WITH ventas_agrupadas AS (
    SELECT
        v.turno_id,
        COUNT(*) AS cantidad_ventas,
        SUM(v.total) AS total_ventas,
        COALESCE(SUM(vp_efectivo), 0) AS total_efectivo,
        COALESCE(SUM(vp_tarjeta), 0) AS total_tarjeta,
        COALESCE(SUM(vp_transferencia), 0) AS total_transferencia,
        COALESCE(SUM(vp_otros), 0) AS total_otros_metodos
    FROM (
        SELECT
            v.id,
            v.turno_id,
            v.total,
            SUM(CASE WHEN LOWER(vp.metodo_pago) = 'efectivo' THEN vp.monto ELSE 0 END) AS vp_efectivo,
            SUM(CASE WHEN LOWER(vp.metodo_pago) = 'tarjeta' THEN vp.monto ELSE 0 END) AS vp_tarjeta,
            SUM(CASE WHEN LOWER(vp.metodo_pago) = 'transferencia' THEN vp.monto ELSE 0 END) AS vp_transferencia,
            SUM(CASE WHEN LOWER(vp.metodo_pago) NOT IN ('efectivo', 'tarjeta', 'transferencia') THEN vp.monto ELSE 0 END) AS vp_otros
        FROM public.ventas v
        LEFT JOIN public.venta_pagos vp ON vp.venta_id = v.id
        WHERE v.estado = 'completada'
        GROUP BY v.id, v.turno_id, v.total
    ) v
    GROUP BY v.turno_id
),
movimientos_agrupados AS (
    SELECT
        cm.turno_id,
        COALESCE(SUM(CASE WHEN cm.tipo = 'ingreso_manual' THEN cm.monto ELSE 0 END), 0) AS total_ingresos_manuales,
        COALESCE(SUM(CASE WHEN cm.tipo = 'egreso_manual' THEN cm.monto ELSE 0 END), 0) AS total_egresos_manuales
    FROM public.caja_movimientos cm
    GROUP BY cm.turno_id
)
SELECT
    ct.id,
    ct.sucursal_id,
    s.nombre AS sucursal_nombre,
    ct.usuario_id,
    p.nombre AS usuario_nombre,
    ct.monto_apertura,
    ct.monto_cierre_esperado,
    ct.monto_cierre_real,
    ct.diferencia_caja,
    ct.abierto_en,
    ct.cerrado_en,
    EXTRACT(EPOCH FROM (COALESCE(ct.cerrado_en, ct.abierto_en) - ct.abierto_en)) / 3600 AS duracion_horas,
    COALESCE(va.cantidad_ventas, 0)::INTEGER AS cantidad_ventas,
    COALESCE(va.total_ventas, 0) AS total_ventas,
    COALESCE(va.total_efectivo, 0) AS total_efectivo,
    COALESCE(va.total_tarjeta, 0) AS total_tarjeta,
    COALESCE(va.total_transferencia, 0) AS total_transferencia,
    COALESCE(va.total_otros_metodos, 0) AS total_otros_metodos,
    COALESCE(ma.total_ingresos_manuales, 0) AS total_ingresos_manuales,
    COALESCE(ma.total_egresos_manuales, 0) AS total_egresos_manuales
FROM public.caja_turnos ct
JOIN public.perfiles p ON p.id = ct.usuario_id
JOIN public.sucursales s ON s.id = ct.sucursal_id
LEFT JOIN ventas_agrupadas va ON va.turno_id = ct.id
LEFT JOIN movimientos_agrupados ma ON ma.turno_id = ct.id
WHERE ct.estado = 'cerrado'
ORDER BY ct.cerrado_en DESC;
