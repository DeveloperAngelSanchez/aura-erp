-- =============================================================
-- Migración 09: Anexión y Reasignación de Ventas a Turnos
-- =============================================================

-- Permitir ventas sin turno activo (turno_id opcional)
ALTER TABLE public.ventas ALTER COLUMN turno_id DROP NOT NULL;

-- Función para recalcular monto_cierre_esperado y diferencia_caja de un turno
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

    -- Sumar ventas en efectivo del turno
    SELECT COALESCE(SUM(
        CASE 
            WHEN vp.id IS NOT NULL THEN (CASE WHEN LOWER(vp.metodo_pago) = 'efectivo' THEN vp.monto ELSE 0 END)
            ELSE (CASE WHEN LOWER(v.metodo_pago) = 'efectivo' THEN v.total ELSE 0 END)
        END
    ), 0)
    INTO v_total_efectivo_ventas
    FROM public.ventas v
    LEFT JOIN public.venta_pagos vp ON vp.venta_id = v.id
    WHERE v.turno_id = p_turno_id AND v.estado = 'completada';

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
