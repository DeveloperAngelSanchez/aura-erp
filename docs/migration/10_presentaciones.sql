-- =============================================================
-- Migración 10: Presentaciones / Variantes de Items
-- =============================================================

-- 1. Tabla de presentaciones
CREATE TABLE IF NOT EXISTS public.item_presentaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    precio_venta DECIMAL(10,2) NOT NULL CHECK (precio_venta >= 0),
    stock_actual INT NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),
    stock_minimo INT NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
    inventariable BOOLEAN NOT NULL DEFAULT false,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(item_id, nombre)
);

CREATE INDEX IF NOT EXISTS idx_item_presentaciones_item ON public.item_presentaciones(item_id);

ALTER TABLE public.item_presentaciones ENABLE ROW LEVEL SECURITY;

-- RLS: misma empresa/sucursal que el item padre
CREATE POLICY "presentaciones_misma_sucursal" ON public.item_presentaciones
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.items i
            JOIN public.sucursales s ON s.id = i.sucursal_id
            WHERE i.id = item_id
              AND s.empresa_id = (SELECT empresa_id FROM public.sucursales WHERE id = (SELECT sucursal_id FROM public.perfiles WHERE id = auth.uid() LIMIT 1))
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.items i
            JOIN public.sucursales s ON s.id = i.sucursal_id
            WHERE i.id = item_id
              AND s.empresa_id = (SELECT empresa_id FROM public.sucursales WHERE id = (SELECT sucursal_id FROM public.perfiles WHERE id = auth.uid() LIMIT 1))
        )
    );

-- 2. Columna presentacion_nombre en venta_detalles
ALTER TABLE public.venta_detalles ADD COLUMN IF NOT EXISTS presentacion_nombre TEXT;

-- 3. Actualizar vista_reporte_ventas para mostrar presentacion
CREATE OR REPLACE VIEW public.vista_reporte_ventas
WITH (security_invoker = true)
AS
SELECT 
  v.id,
  v.total,
  v.metodo_pago,
  v.creado_en,
  v.sucursal_id,
  v.usuario_id,
  v.turno_id,
  v.barbero_id,
  v.moneda,
  p_cajero.nombre AS usuario_nombre,
  p_barbero.nombre AS barbero_nombre,
  s.nombre AS sucursal_nombre,
  v.creado_en::date AS fecha,
  (
    SELECT string_agg(
      CASE 
        WHEN vd.presentacion_nombre IS NOT NULL AND vd.presentacion_nombre <> '' 
        THEN i.nombre || ' - ' || vd.presentacion_nombre || ' x' || vd.cantidad::text
        ELSE i.nombre || ' x' || vd.cantidad::text
      END,
      ', ' ORDER BY vd.id
    )
    FROM public.venta_detalles vd
    JOIN public.items i ON vd.item_id = i.id
    WHERE vd.venta_id = v.id
  ) AS items_detalle,
  COALESCE(
    (
      SELECT SUM(vd.precio_unitario * vd.cantidad) * 
             COALESCE(
               p_barbero.comision_porcentaje, 
               conf.comision_barbero_default, 
               0
             ) / 100.0
      FROM public.venta_detalles vd
      JOIN public.items i ON vd.item_id = i.id
      WHERE vd.venta_id = v.id AND i.tipo = 'servicio'
    ), 
    0.00
  )::DECIMAL(10,2) AS comision_generada
FROM public.ventas v
JOIN public.perfiles p_cajero ON v.usuario_id = p_cajero.id
LEFT JOIN public.perfiles p_barbero ON v.barbero_id = p_barbero.id
JOIN public.sucursales s ON v.sucursal_id = s.id
LEFT JOIN public.configuraciones conf ON v.sucursal_id = conf.sucursal_id;

-- 4. Extender procesar_venta_pos para soportar presentaciones
CREATE OR REPLACE FUNCTION public.procesar_venta_pos(
    p_sucursal_id UUID,
    p_turno_id UUID,
    p_usuario_id UUID,
    p_total DECIMAL,
    p_items JSONB,
    p_pagos JSONB,
    p_barbero_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_venta_id UUID;
    v_item RECORD;
    v_pago RECORD;
    v_comp RECORD;
    v_turno_estado VARCHAR;
    v_metodo_principal VARCHAR;
    v_moneda_sucursal VARCHAR(10);
    v_usuario_sucursal UUID;
    v_usuario_empresa UUID;
    v_turno_empresa UUID;
    v_item_inventariable BOOLEAN;
    v_pres_inventariable BOOLEAN;
    v_pres_stock_actual INT;
BEGIN
    -- 1. Validar turno abierto
    SELECT estado INTO v_turno_estado FROM public.caja_turnos WHERE id = p_turno_id;
    IF v_turno_estado IS NULL OR v_turno_estado <> 'abierto' THEN
        RAISE EXCEPTION 'El turno de caja no está abierto o no existe.';
    END IF;

    -- 2. Validar sucursal del usuario
    SELECT sucursal_id INTO v_usuario_sucursal FROM public.perfiles WHERE id = p_usuario_id;
    IF v_usuario_sucursal IS NULL OR v_usuario_sucursal <> p_sucursal_id THEN
        RAISE EXCEPTION 'La sucursal no coincide con la del usuario.';
    END IF;

    -- 3. Validar sucursal del turno
    IF (SELECT sucursal_id FROM public.caja_turnos WHERE id = p_turno_id) <> p_sucursal_id THEN
        RAISE EXCEPTION 'El turno de caja no pertenece a la sucursal especificada.';
    END IF;

    -- 4. Validar multiempresa
    SELECT suc_id.empresa_id INTO v_usuario_empresa
    FROM public.perfiles p
    JOIN public.sucursales suc_id ON suc_id.id = p.sucursal_id
    WHERE p.id = p_usuario_id;

    SELECT s.empresa_id INTO v_turno_empresa
    FROM public.caja_turnos ct
    JOIN public.sucursales s ON s.id = ct.sucursal_id
    WHERE ct.id = p_turno_id;

    IF v_usuario_empresa IS DISTINCT FROM v_turno_empresa THEN
        RAISE EXCEPTION 'El usuario y el turno pertenecen a empresas diferentes.';
    END IF;

    -- 5. Validar items
    IF EXISTS (
        SELECT 1 FROM jsonb_to_recordset(p_items) AS x(item_id UUID)
        WHERE NOT EXISTS (
            SELECT 1 FROM public.items i
            JOIN public.sucursales s ON s.id = i.sucursal_id
            WHERE i.id = x.item_id AND i.sucursal_id = p_sucursal_id AND s.empresa_id = v_usuario_empresa
        )
    ) THEN
        RAISE EXCEPTION 'Uno o más items no pertenecen a la sucursal/empresa especificada.';
    END IF;

    -- 6. Determinar método principal
    IF jsonb_array_length(p_pagos) = 1 THEN
        v_metodo_principal := p_pagos->0->>'metodo_pago';
    ELSE
        v_metodo_principal := 'mixto';
    END IF;

    -- 7. Obtener moneda
    SELECT moneda INTO v_moneda_sucursal FROM public.configuraciones WHERE sucursal_id = p_sucursal_id LIMIT 1;
    IF v_moneda_sucursal IS NULL THEN v_moneda_sucursal := 'USD'; END IF;

    -- 8. Insertar venta
    INSERT INTO public.ventas (sucursal_id, turno_id, usuario_id, metodo_pago, total, barbero_id, moneda, estado)
    VALUES (p_sucursal_id, p_turno_id, p_usuario_id, v_metodo_principal, p_total, p_barbero_id, v_moneda_sucursal, 'completada')
    RETURNING id INTO v_venta_id;

    -- 9. Insertar pagos y movimientos de caja
    FOR v_pago IN SELECT * FROM jsonb_to_recordset(p_pagos) AS p(metodo_pago VARCHAR, monto DECIMAL)
    LOOP
        INSERT INTO public.venta_pagos (venta_id, metodo_pago, monto)
        VALUES (v_venta_id, v_pago.metodo_pago, v_pago.monto);
        IF lower(v_pago.metodo_pago) = 'efectivo' THEN
            INSERT INTO public.caja_movimientos (turno_id, tipo, monto, motivo)
            VALUES (p_turno_id, 'ingreso_venta', v_pago.monto, 'Venta POS - Ticket ID: ' || v_venta_id);
        END IF;
    END LOOP;

    -- 10. Insertar detalles, descontar stock (soporta presentaciones)
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        item_id UUID, cantidad INT, precio_unitario DECIMAL, presentacion_nombre TEXT
    )
    LOOP
        INSERT INTO public.venta_detalles (venta_id, item_id, cantidad, precio_unitario, presentacion_nombre)
        VALUES (v_venta_id, v_item.item_id, v_item.cantidad, v_item.precio_unitario, v_item.presentacion_nombre);

        IF v_item.presentacion_nombre IS NOT NULL AND v_item.presentacion_nombre <> '' THEN
            -- Descontar stock de la presentacion si es inventariable
            SELECT inventariable, stock_actual INTO v_pres_inventariable, v_pres_stock_actual
            FROM public.item_presentaciones
            WHERE item_id = v_item.item_id AND nombre = v_item.presentacion_nombre;

            IF v_pres_inventariable THEN
                IF v_pres_stock_actual < v_item.cantidad THEN
                    RAISE EXCEPTION 'Stock insuficiente para la presentacion % del item %.', v_item.presentacion_nombre, v_item.item_id;
                END IF;
                UPDATE public.item_presentaciones
                SET stock_actual = stock_actual - v_item.cantidad
                WHERE item_id = v_item.item_id AND nombre = v_item.presentacion_nombre;
            END IF;
        ELSE
            -- Comportamiento anterior: stock del item base
            SELECT inventariable INTO v_item_inventariable FROM public.items WHERE id = v_item.item_id;

            IF v_item_inventariable THEN
                IF (SELECT tipo FROM public.items WHERE id = v_item.item_id) = 'producto' THEN
                    UPDATE public.items SET stock_actual = stock_actual - v_item.cantidad
                    WHERE id = v_item.item_id AND stock_actual >= v_item.cantidad;
                    IF NOT FOUND THEN RAISE EXCEPTION 'Stock insuficiente para el item %.', v_item.item_id; END IF;
                ELSIF (SELECT tipo FROM public.items WHERE id = v_item.item_id) = 'kit' THEN
                    FOR v_comp IN SELECT componente_hijo_id, cantidad_requerida FROM public.kit_composicion WHERE kit_padre_id = v_item.item_id
                    LOOP
                        IF (SELECT tipo FROM public.items WHERE id = v_comp.componente_hijo_id) = 'producto' THEN
                            UPDATE public.items SET stock_actual = stock_actual - (v_comp.cantidad_requerida * v_item.cantidad)
                            WHERE id = v_comp.componente_hijo_id AND stock_actual >= (v_comp.cantidad_requerida * v_item.cantidad);
                            IF NOT FOUND THEN RAISE EXCEPTION 'Stock insuficiente para el componente % del kit %.', v_comp.componente_hijo_id, v_item.item_id; END IF;
                        END IF;
                    END LOOP;
                END IF;
            END IF;
        END IF;
    END LOOP;

    RETURN v_venta_id;
END;
$$;

-- 5. Extender anular_venta_pos para revertir stock de presentaciones
CREATE OR REPLACE FUNCTION public.anular_venta_pos(
    p_venta_id UUID,
    p_motivo TEXT
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_sucursal_id UUID;
    v_turno_id UUID;
    v_item RECORD;
    v_comp RECORD;
    v_pago RECORD;
    v_estado VARCHAR;
BEGIN
    SELECT estado, sucursal_id, turno_id INTO v_estado, v_sucursal_id, v_turno_id
    FROM public.ventas WHERE id = p_venta_id;
    IF v_estado IS NULL THEN
        RAISE EXCEPTION 'La venta % no existe.', p_venta_id;
    END IF;
    IF v_estado = 'anulada' THEN
        RAISE EXCEPTION 'La venta % ya fue anulada anteriormente.', p_venta_id;
    END IF;

    UPDATE public.ventas SET estado = 'anulada' WHERE id = p_venta_id;

    -- Revertir stock de cada detalle (soporta presentaciones)
    FOR v_item IN
        SELECT vd.item_id, vd.cantidad, i.inventariable, i.tipo, vd.presentacion_nombre
        FROM public.venta_detalles vd
        JOIN public.items i ON i.id = vd.item_id
        WHERE vd.venta_id = p_venta_id
    LOOP
        IF v_item.presentacion_nombre IS NOT NULL AND v_item.presentacion_nombre <> '' THEN
            UPDATE public.item_presentaciones
            SET stock_actual = stock_actual + v_item.cantidad
            WHERE item_id = v_item.item_id AND nombre = v_item.presentacion_nombre;
        ELSIF v_item.inventariable AND v_item.tipo = 'producto' THEN
            UPDATE public.items SET stock_actual = stock_actual + v_item.cantidad
            WHERE id = v_item.item_id;
        ELSIF v_item.inventariable AND v_item.tipo = 'kit' THEN
            FOR v_comp IN SELECT componente_hijo_id, cantidad_requerida FROM public.kit_composicion WHERE kit_padre_id = v_item.item_id
            LOOP
                IF (SELECT tipo FROM public.items WHERE id = v_comp.componente_hijo_id) = 'producto' THEN
                    UPDATE public.items SET stock_actual = stock_actual + (v_comp.cantidad_requerida * v_item.cantidad)
                    WHERE id = v_comp.componente_hijo_id;
                END IF;
            END LOOP;
        END IF;
    END LOOP;

    -- Revertir pagos en efectivo
    FOR v_pago IN SELECT metodo_pago, monto FROM public.venta_pagos WHERE venta_id = p_venta_id
    LOOP
        IF lower(v_pago.metodo_pago) = 'efectivo' THEN
            INSERT INTO public.caja_movimientos (turno_id, tipo, monto, motivo)
            VALUES (v_turno_id, 'egreso_manual', v_pago.monto, 'Anulación venta - Ticket ID: ' || p_venta_id || ' - Motivo: ' || p_motivo);
        END IF;
    END LOOP;

    RETURN p_venta_id;
END;
$$;
