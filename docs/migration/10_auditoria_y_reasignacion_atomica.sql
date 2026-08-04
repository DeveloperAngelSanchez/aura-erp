-- =============================================================
-- Migración 10: Auditoría, Campos Históricos y Reasignación Atómica
-- =============================================================

-- 1. Agregar columnas para turnos históricos/manuales en caja_turnos
ALTER TABLE public.caja_turnos 
ADD COLUMN IF NOT EXISTS es_manual BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notas_auditoria TEXT;

-- 2. Crear tabla de auditoría para movimientos de caja y ventas
CREATE TABLE IF NOT EXISTS public.caja_auditoria_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    turno_id UUID REFERENCES public.caja_turnos(id) ON DELETE SET NULL,
    venta_id UUID REFERENCES public.ventas(id) ON DELETE SET NULL,
    usuario_id UUID REFERENCES public.perfiles(id) ON DELETE SET NULL,
    accion VARCHAR(50) NOT NULL,
    detalle JSONB,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS en caja_auditoria_log
ALTER TABLE public.caja_auditoria_log ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para caja_auditoria_log
CREATE POLICY "Permitir lectura de auditoria a usuarios autenticados"
ON public.caja_auditoria_log FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Permitir insercion de auditoria a usuarios autenticados"
ON public.caja_auditoria_log FOR INSERT
TO authenticated
WITH CHECK (true);

-- 3. Actualizar la función recalcular_totales_turno con soporte para fallback de metodo_pago
CREATE OR REPLACE FUNCTION public.recalcular_totales_turno(p_turno_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_monto_apertura NUMERIC;
    v_monto_cierre_real NUMERIC;
    v_total_efectivo_ventas NUMERIC;
    v_total_ingresos_manuales NUMERIC;
    v_total_egresos_manuales NUMERIC;
    v_nuevo_esperado NUMERIC;
    v_nueva_diferencia NUMERIC;
BEGIN
    IF p_turno_id IS NULL THEN
        RETURN;
    END IF;

    -- Obtener datos base del turno
    SELECT monto_apertura, monto_cierre_real
    INTO v_monto_apertura, v_monto_cierre_real
    FROM public.caja_turnos
    WHERE id = p_turno_id;

    IF v_monto_apertura IS NULL THEN
        RETURN;
    END IF;

    -- Sumar ventas en efectivo del turno con fallback si venta_pagos no tiene registros
    SELECT COALESCE(SUM(
        CASE 
            WHEN sub.tiene_pagos > 0 THEN sub.efectivo_pagos
            ELSE (CASE WHEN LOWER(sub.metodo_pago_venta) = 'efectivo' THEN sub.total_venta ELSE 0 END)
        END
    ), 0)
    INTO v_total_efectivo_ventas
    FROM (
        SELECT 
            v.id,
            v.total AS total_venta,
            v.metodo_pago AS metodo_pago_venta,
            COUNT(vp.id) AS tiene_pagos,
            SUM(CASE WHEN LOWER(vp.metodo_pago) = 'efectivo' THEN vp.monto ELSE 0 END) AS efectivo_pagos
        FROM public.ventas v
        LEFT JOIN public.venta_pagos vp ON vp.venta_id = v.id
        WHERE v.turno_id = p_turno_id AND v.estado = 'completada'
        GROUP BY v.id, v.total, v.metodo_pago
    ) sub;

    -- Sumar ingresos y egresos manuales del turno
    SELECT 
        COALESCE(SUM(CASE WHEN tipo = 'ingreso_manual' THEN monto ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN tipo = 'egreso_manual' THEN monto ELSE 0 END), 0)
    INTO v_total_ingresos_manuales, v_total_egresos_manuales
    FROM public.caja_movimientos
    WHERE turno_id = p_turno_id;

    -- Recalcular monto esperado y diferencia
    v_nuevo_esperado := v_monto_apertura + v_total_efectivo_ventas + v_total_ingresos_manuales - v_total_egresos_manuales;
    
    IF v_monto_cierre_real IS NOT NULL THEN
        v_nueva_diferencia := v_monto_cierre_real - v_nuevo_esperado;
    ELSE
        v_nueva_diferencia := NULL;
    END IF;

    -- Actualizar turno
    UPDATE public.caja_turnos
    SET 
        monto_cierre_esperado = v_nuevo_esperado,
        diferencia_caja = v_nueva_diferencia
    WHERE id = p_turno_id;
END;
$$;

-- 4. Actualizar la vista vista_reporte_cierres_turno con soporte de fallback
DROP VIEW IF EXISTS public.vista_reporte_cierres_turno CASCADE;
CREATE OR REPLACE VIEW public.vista_reporte_cierres_turno
WITH (security_invoker = true)
AS
WITH ventas_agrupadas AS (
    SELECT
        v.turno_id,
        COUNT(*) AS cantidad_ventas,
        SUM(v.total_venta) AS total_ventas,
        COALESCE(SUM(v.efectivo_final), 0) AS total_efectivo,
        COALESCE(SUM(v.tarjeta_final), 0) AS total_tarjeta,
        COALESCE(SUM(v.transferencia_final), 0) AS total_transferencia,
        COALESCE(SUM(v.otros_final), 0) AS total_otros_metodos
    FROM (
        SELECT
            v.id,
            v.turno_id,
            v.total AS total_venta,
            CASE 
                WHEN COUNT(vp.id) > 0 THEN SUM(CASE WHEN LOWER(vp.metodo_pago) = 'efectivo' THEN vp.monto ELSE 0 END)
                ELSE (CASE WHEN LOWER(v.metodo_pago) = 'efectivo' THEN v.total ELSE 0 END)
            END AS efectivo_final,
            CASE 
                WHEN COUNT(vp.id) > 0 THEN SUM(CASE WHEN LOWER(vp.metodo_pago) = 'tarjeta' THEN vp.monto ELSE 0 END)
                ELSE (CASE WHEN LOWER(v.metodo_pago) = 'tarjeta' THEN v.total ELSE 0 END)
            END AS tarjeta_final,
            CASE 
                WHEN COUNT(vp.id) > 0 THEN SUM(CASE WHEN LOWER(vp.metodo_pago) = 'transferencia' THEN vp.monto ELSE 0 END)
                ELSE (CASE WHEN LOWER(v.metodo_pago) = 'transferencia' THEN v.total ELSE 0 END)
            END AS transferencia_final,
            CASE 
                WHEN COUNT(vp.id) > 0 THEN SUM(CASE WHEN LOWER(vp.metodo_pago) NOT IN ('efectivo', 'tarjeta', 'transferencia') THEN vp.monto ELSE 0 END)
                ELSE (CASE WHEN LOWER(v.metodo_pago) NOT IN ('efectivo', 'tarjeta', 'transferencia') THEN v.total ELSE 0 END)
            END AS otros_final
        FROM public.ventas v
        LEFT JOIN public.venta_pagos vp ON vp.venta_id = v.id
        WHERE v.estado = 'completada'
        GROUP BY v.id, v.turno_id, v.total, v.metodo_pago
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
    COALESCE(ct.es_manual, false) AS es_manual,
    ct.notas_auditoria,
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

-- 5. Crear función RPC atómica para reasignación masiva de ventas con auditoría
CREATE OR REPLACE FUNCTION public.reasignar_ventas_a_turno_atomico(
    p_turno_destino_id UUID,
    p_venta_ids UUID[],
    p_usuario_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_old_turno_ids UUID[];
    v_old_id UUID;
    v_venta_id UUID;
BEGIN
    IF p_turno_destino_id IS NULL THEN
        RAISE EXCEPTION 'El turno de destino es obligatorio.';
    END IF;

    IF p_venta_ids IS NULL OR array_length(p_venta_ids, 1) IS NULL THEN
        RAISE EXCEPTION 'Debe seleccionar al menos una venta para anexar.';
    END IF;

    -- Obtener la lista de turnos de origen distintos antes de la actualización
    SELECT ARRAY_AGG(DISTINCT turno_id)
    INTO v_old_turno_ids
    FROM public.ventas
    WHERE id = ANY(p_venta_ids) AND turno_id IS NOT NULL;

    -- Reasignar las ventas al turno destino
    UPDATE public.ventas
    SET turno_id = p_turno_destino_id
    WHERE id = ANY(p_venta_ids);

    -- Registrar auditoría por cada venta reasignada
    FOREACH v_venta_id IN ARRAY p_venta_ids LOOP
        INSERT INTO public.caja_auditoria_log (
            turno_id,
            venta_id,
            usuario_id,
            accion,
            detalle
        ) VALUES (
            p_turno_destino_id,
            v_venta_id,
            p_usuario_id,
            'REASIGNACION_VENTA',
            jsonb_build_object('accion', 'anexar_o_reasignar', 'turno_destino', p_turno_destino_id)
        );
    END LOOP;

    -- Recalcular el turno de destino
    PERFORM public.recalcular_totales_turno(p_turno_destino_id);

    -- Recalcular los turnos de origen si existían
    IF v_old_turno_ids IS NOT NULL THEN
        FOREACH v_old_id IN ARRAY v_old_turno_ids LOOP
            IF v_old_id != p_turno_destino_id THEN
                PERFORM public.recalcular_totales_turno(v_old_id);
            END IF;
        END LOOP;
    END IF;
END;
$$;

-- 6. Crear función RPC atómica para desvinculación individual de venta
CREATE OR REPLACE FUNCTION public.desvincular_venta_de_turno_atomico(
    p_venta_id UUID,
    p_usuario_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_old_turno_id UUID;
BEGIN
    IF p_venta_id IS NULL THEN
        RAISE EXCEPTION 'El ID de la venta es obligatorio.';
    END IF;

    SELECT turno_id INTO v_old_turno_id
    FROM public.ventas
    WHERE id = p_venta_id;

    IF v_old_turno_id IS NULL THEN
        RETURN;
    END IF;

    -- Desvincular la venta
    UPDATE public.ventas
    SET turno_id = NULL
    WHERE id = p_venta_id;

    -- Registrar en auditoría
    INSERT INTO public.caja_auditoria_log (
        turno_id,
        venta_id,
        usuario_id,
        accion,
        detalle
    ) VALUES (
        v_old_turno_id,
        p_venta_id,
        p_usuario_id,
        'DESVINCULACION_VENTA',
        jsonb_build_object('turno_anterior', v_old_turno_id)
    );

    -- Recalcular el turno de origen
    PERFORM public.recalcular_totales_turno(v_old_turno_id);
END;
$$;
