-- 1. Agregar columna barbero_id a la tabla de ventas
ALTER TABLE public.ventas 
ADD COLUMN IF NOT EXISTS barbero_id UUID REFERENCES public.perfiles(id) ON DELETE SET NULL;

-- 2. Reemplazar la función RPC procesar_venta_pos para registrar el barbero de la atención
CREATE OR REPLACE FUNCTION public.procesar_venta_pos(
  p_sucursal_id UUID,
  p_turno_id UUID,
  p_usuario_id UUID,
  p_metodo_pago VARCHAR,
  p_total DECIMAL,
  p_items JSONB,
  p_barbero_id UUID DEFAULT NULL -- Nuevo parámetro opcional para asociar la atención
) RETURNS UUID AS $$
DECLARE
  v_venta_id UUID;
  v_item RECORD;
  v_comp RECORD;
  v_turno_estado VARCHAR;
BEGIN
  -- 1. Validar que el turno de caja esté abierto
  SELECT estado INTO v_turno_estado FROM public.caja_turnos WHERE id = p_turno_id;
  IF v_turno_estado IS NULL OR v_turno_estado <> 'abierto' THEN
    RAISE EXCEPTION 'El turno de caja no está abierto o no existe.';
  END IF;

  -- 2. Insertar cabecera de la venta incluyendo el barbero_id
  INSERT INTO public.ventas (sucursal_id, turno_id, usuario_id, metodo_pago, total, barbero_id)
  VALUES (p_sucursal_id, p_turno_id, p_usuario_id, p_metodo_pago, p_total, p_barbero_id)
  RETURNING id INTO v_venta_id;

  -- 3. Recorrer los productos del carrito
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(item_id UUID, cantidad INT, precio_unitario DECIMAL)
  LOOP
    -- A. Registrar detalle de la venta
    INSERT INTO public.venta_detalles (venta_id, item_id, cantidad, precio_unitario)
    VALUES (v_venta_id, v_item.item_id, v_item.cantidad, v_item.precio_unitario);

    -- B. Descontar stock dependiendo de la categoría del item
    -- Caso 1: Es un Producto Físico Directo
    IF (SELECT tipo FROM public.items WHERE id = v_item.item_id) = 'producto' THEN
      UPDATE public.items 
      SET stock_actual = stock_actual - v_item.cantidad 
      WHERE id = v_item.item_id;
    
    -- Caso 2: Es un Combo/Kit (descuenta stock de sus productos componentes recursivamente)
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

  -- 4. Registrar el ingreso de efectivo en la caja si el pago fue en efectivo
  IF p_metodo_pago = 'efectivo' THEN
    INSERT INTO public.caja_movimientos (turno_id, tipo, monto, motivo)
    VALUES (p_turno_id, 'ingreso_venta', p_total, 'Venta POS - Ticket ID: ' || v_venta_id);
  END IF;

  RETURN v_venta_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
