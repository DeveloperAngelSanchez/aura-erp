-- =============================================================
-- Migración 09: RPC para editar venta
-- =============================================================

CREATE OR REPLACE FUNCTION public.editar_venta_pos(
    p_venta_id UUID,
    p_pagos JSONB,
    p_barbero_id UUID DEFAULT NULL,
    p_cliente_nombre TEXT DEFAULT NULL,
    p_creado_en TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_turno_id UUID;
    v_estado VARCHAR;
    v_metodo_principal VARCHAR;
    v_total DECIMAL;
    v_pago RECORD;
BEGIN
    -- 1. Validar que la venta existe y está completada
    SELECT estado, turno_id INTO v_estado, v_turno_id
    FROM public.ventas WHERE id = p_venta_id;

    IF v_estado IS NULL THEN
        RAISE EXCEPTION 'La venta % no existe.', p_venta_id;
    END IF;
    IF v_estado <> 'completada' THEN
        RAISE EXCEPTION 'No se puede editar una venta en estado %.', v_estado;
    END IF;

    -- 2. Validar que hay al menos un pago
    IF jsonb_array_length(p_pagos) = 0 THEN
        RAISE EXCEPTION 'Debe haber al menos un método de pago.';
    END IF;

    -- 3. Determinar método principal y calcular total
    IF jsonb_array_length(p_pagos) = 1 THEN
        v_metodo_principal := p_pagos->0->>'metodo_pago';
    ELSE
        v_metodo_principal := 'mixto';
    END IF;

    SELECT SUM(x.monto) INTO v_total
    FROM jsonb_to_recordset(p_pagos) AS x(metodo_pago VARCHAR, monto DECIMAL);

    -- 4. Eliminar movimientos de caja anteriores (ingreso_venta) asociados a esta venta
    DELETE FROM public.caja_movimientos
    WHERE turno_id = v_turno_id
      AND tipo = 'ingreso_venta'
      AND motivo = 'Venta POS - Ticket ID: ' || p_venta_id;

    -- 5. Eliminar pagos anteriores
    DELETE FROM public.venta_pagos WHERE venta_id = p_venta_id;

    -- 6. Insertar nuevos pagos y movimientos de caja
    FOR v_pago IN SELECT * FROM jsonb_to_recordset(p_pagos) AS x(metodo_pago VARCHAR, monto DECIMAL)
    LOOP
        INSERT INTO public.venta_pagos (venta_id, metodo_pago, monto)
        VALUES (p_venta_id, v_pago.metodo_pago, v_pago.monto);

        IF lower(v_pago.metodo_pago) = 'efectivo' THEN
            INSERT INTO public.caja_movimientos (turno_id, tipo, monto, motivo)
            VALUES (v_turno_id, 'ingreso_venta', v_pago.monto, 'Venta POS - Ticket ID: ' || p_venta_id);
        END IF;
    END LOOP;

    -- 7. Actualizar la venta
    UPDATE public.ventas
    SET
        metodo_pago = v_metodo_principal,
        total = v_total,
        barbero_id = p_barbero_id,
        cliente_nombre = COALESCE(p_cliente_nombre, cliente_nombre),
        creado_en = COALESCE(p_creado_en, creado_en)
    WHERE id = p_venta_id;

    RETURN p_venta_id;
END;
$$;
