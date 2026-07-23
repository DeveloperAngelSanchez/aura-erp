-- 1. Modificar tabla perfiles para añadir la comisión individual por barbero
ALTER TABLE public.perfiles 
ADD COLUMN IF NOT EXISTS comision_porcentaje DECIMAL(5,2) DEFAULT NULL CHECK (comision_porcentaje >= 0 AND comision_porcentaje <= 100);

-- 2. Modificar tabla configuraciones para almacenar métodos de pago configurables
ALTER TABLE public.configuraciones
ADD COLUMN IF NOT EXISTS metodos_pago JSONB DEFAULT '["efectivo", "tarjeta", "transferencia"]'::jsonb,
ADD COLUMN IF NOT EXISTS metodos_pago_favoritos JSONB DEFAULT '["efectivo", "tarjeta", "transferencia"]'::jsonb;

-- 3. Modificar tabla items para añadir campos avanzados de inventario
ALTER TABLE public.items
ADD COLUMN IF NOT EXISTS stock_inicial INT DEFAULT 0 CHECK (stock_inicial >= 0),
ADD COLUMN IF NOT EXISTS stock_minimo INT DEFAULT 0 CHECK (stock_minimo >= 0),
ADD COLUMN IF NOT EXISTS precio_costo DECIMAL(10,2) DEFAULT 0 CHECK (precio_costo >= 0),
ADD COLUMN IF NOT EXISTS foto_url TEXT DEFAULT NULL;

-- 4. Crear tabla para registrar los pagos fraccionados/múltiples por venta
CREATE TABLE IF NOT EXISTS public.venta_pagos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venta_id UUID NOT NULL REFERENCES public.ventas(id) ON DELETE CASCADE,
    metodo_pago VARCHAR(50) NOT NULL,
    monto DECIMAL(10,2) NOT NULL CHECK (monto > 0),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS en venta_pagos
ALTER TABLE public.venta_pagos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura de pagos a empleados de la sucursal" ON public.venta_pagos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.ventas v
            JOIN public.perfiles p ON p.id = auth.uid()
            WHERE v.id = public.venta_pagos.venta_id AND v.sucursal_id = p.sucursal_id
        )
    );

CREATE POLICY "Permitir inserción de pagos a empleados de la sucursal" ON public.venta_pagos
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.ventas v
            JOIN public.perfiles p ON p.id = auth.uid()
            WHERE v.id = public.venta_pagos.venta_id AND v.sucursal_id = p.sucursal_id
        )
    );

-- 5. Quitar constraint restrictivo de la tabla de ventas
ALTER TABLE public.ventas DROP CONSTRAINT IF EXISTS ventas_metodo_pago_check;

-- 6. Crear/reemplazar la RPC para procesar ventas con pagos múltiples/fraccionados
CREATE OR REPLACE FUNCTION public.procesar_venta_pos(
  p_sucursal_id UUID,
  p_turno_id UUID,
  p_usuario_id UUID,
  p_total DECIMAL,
  p_items JSONB,
  p_pagos JSONB, -- Arreglo de pagos: [{"metodo_pago": "efectivo", "monto": 10.00}]
  p_barbero_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_venta_id UUID;
  v_item RECORD;
  v_pago RECORD;
  v_comp RECORD;
  v_turno_estado VARCHAR;
  v_metodo_principal VARCHAR;
BEGIN
  -- 1. Validar que el turno de caja esté abierto
  SELECT estado INTO v_turno_estado FROM public.caja_turnos WHERE id = p_turno_id;
  IF v_turno_estado IS NULL OR v_turno_estado <> 'abierto' THEN
    RAISE EXCEPTION 'El turno de caja no está abierto o no existe.';
  END IF;

  -- 2. Determinar un método de pago principal para fines históricos/retrocompatibilidad
  IF jsonb_array_length(p_pagos) = 1 THEN
    v_metodo_principal := p_pagos->0->>'metodo_pago';
  ELSE
    v_metodo_principal := 'mixto';
  END IF;

  -- 3. Insertar la cabecera de la venta
  INSERT INTO public.ventas (sucursal_id, turno_id, usuario_id, metodo_pago, total, barbero_id)
  VALUES (p_sucursal_id, p_turno_id, p_usuario_id, v_metodo_principal, p_total, p_barbero_id)
  RETURNING id INTO v_venta_id;

  -- 4. Insertar los pagos en la tabla venta_pagos y registrar ingresos de efectivo en caja
  FOR v_pago IN SELECT * FROM jsonb_to_recordset(p_pagos) AS p(metodo_pago VARCHAR, monto DECIMAL)
  LOOP
    INSERT INTO public.venta_pagos (venta_id, metodo_pago, monto)
    VALUES (v_venta_id, v_pago.metodo_pago, v_pago.monto);

    -- Registrar ingresos en caja si el método de pago es efectivo
    IF lower(v_pago.metodo_pago) = 'efectivo' THEN
      INSERT INTO public.caja_movimientos (turno_id, tipo, monto, motivo)
      VALUES (p_turno_id, 'ingreso_venta', v_pago.monto, 'Venta POS - Ticket ID: ' || v_venta_id);
    END IF;
  END LOOP;

  -- 5. Recorrer los productos/servicios del carrito
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(item_id UUID, cantidad INT, precio_unitario DECIMAL)
  LOOP
    -- Registrar el detalle
    INSERT INTO public.venta_detalles (venta_id, item_id, cantidad, precio_unitario)
    VALUES (v_venta_id, v_item.item_id, v_item.cantidad, v_item.precio_unitario);

    -- Descontar stock dependiendo de la categoría del item
    IF (SELECT tipo FROM public.items WHERE id = v_item.item_id) = 'producto' THEN
      UPDATE public.items 
      SET stock_actual = stock_actual - v_item.cantidad 
      WHERE id = v_item.item_id;
    
    ELSIF (SELECT tipo FROM public.items WHERE id = v_item.item_id) = 'kit' THEN
      FOR v_comp IN SELECT componente_hijo_id, cantidad_requerida FROM public.kit_composicion WHERE kit_padre_id = v_item.item_id
      LOOP
        IF (SELECT tipo FROM public.items WHERE id = v_comp.componente_hijo_id) = 'producto' THEN
          UPDATE public.items 
          SET stock_actual = stock_actual - (v_comp.cantidad_requerida * v_item.cantidad)
          WHERE id = v_comp.componente_hijo_id;
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  RETURN v_venta_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Recrear la vista de reporte de ventas para auditorías y comisiones del barbero
CREATE OR REPLACE VIEW public.vista_reporte_ventas AS
SELECT 
  v.id,
  v.total,
  v.metodo_pago,
  v.creado_en,
  v.sucursal_id,
  v.usuario_id,
  v.turno_id,
  v.barbero_id,
  p_cajero.nombre AS usuario_nombre,
  p_barbero.nombre AS barbero_nombre,
  s.nombre AS sucursal_nombre,
  v.creado_en::date AS fecha,
  
  -- Detalle condensado de ítems comprados
  (
    SELECT string_agg(i.nombre || ' x' || vd.cantidad::text, ', ')
    FROM public.venta_detalles vd
    JOIN public.items i ON vd.item_id = i.id
    WHERE vd.venta_id = v.id
  ) AS items_detalle,

  -- Cálculo dinámico de comisiones del barbero sobre los servicios del ticket
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
