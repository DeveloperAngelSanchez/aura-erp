-- =============================================================================
-- Migración 12: Soporte POS Histórico para procesar_venta_pos
-- =============================================================================
-- Problema: La función procesar_venta_pos valida que el turno esté 'abierto',
-- pero un turno histórico se crea con estado 'cerrado' + es_manual = true.
-- Al intentar agregar ventas desde el POS histórico, la RPC falla con:
-- "El turno de caja no está abierto o no existe."
--
-- Solución: Permitir que un turno con es_manual = true (histórico) acepte
-- ventas sin importar su estado. También se relaja la validación de sucursal
-- del usuario para admins operando desde otra sucursal.
-- =============================================================================

-- Reemplazar la función de 9 argumentos (la que usa el frontend)
CREATE OR REPLACE FUNCTION public.procesar_venta_pos(
  p_sucursal_id UUID,
  p_turno_id UUID,
  p_usuario_id UUID,
  p_total DECIMAL,
  p_items JSONB,
  p_pagos JSONB,
  p_barbero_id UUID DEFAULT NULL,
  p_cliente_id UUID DEFAULT NULL,
  p_cliente_nombre VARCHAR DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_venta_id UUID;
  v_item RECORD;
  v_comp RECORD;
  v_pago RECORD;
  v_turno_estado VARCHAR;
  v_turno_es_manual BOOLEAN;
  v_metodo_principal VARCHAR;
  v_moneda_sucursal VARCHAR(10);
  v_usuario_sucursal UUID;
  v_usuario_empresa UUID;
  v_turno_empresa UUID;
  v_usuario_rol VARCHAR;
  v_item_inventariable BOOLEAN;
  v_correlativo INTEGER;
  v_correlativo_inicial INTEGER;
BEGIN
  -- 1. Validar turno: permitir turnos manuales/históricos (cerrados con es_manual=true)
  SELECT estado, COALESCE(es_manual, false)
  INTO v_turno_estado, v_turno_es_manual
  FROM public.caja_turnos WHERE id = p_turno_id;

  IF v_turno_estado IS NULL THEN
    RAISE EXCEPTION 'El turno de caja no existe.';
  END IF;

  -- Turno normal: debe estar abierto.  Turno histórico (es_manual): acepta cualquier estado.
  IF NOT v_turno_es_manual AND v_turno_estado <> 'abierto' THEN
    RAISE EXCEPTION 'El turno de caja no está abierto o no existe.';
  END IF;

  -- 2. Validar sucursal del usuario (admins pueden operar cross-branch)
  SELECT sucursal_id, rol INTO v_usuario_sucursal, v_usuario_rol
  FROM public.perfiles WHERE id = p_usuario_id;

  -- Solo validar match de sucursal si NO es admin
  IF v_usuario_rol <> 'admin' THEN
    IF v_usuario_sucursal IS NULL OR v_usuario_sucursal <> p_sucursal_id THEN
      RAISE EXCEPTION 'La sucursal no coincide con la del usuario.';
    END IF;
  END IF;

  -- 3. Validar que el turno pertenezca a la sucursal indicada
  IF (SELECT sucursal_id FROM public.caja_turnos WHERE id = p_turno_id) <> p_sucursal_id THEN
    RAISE EXCEPTION 'El turno de caja no pertenece a la sucursal especificada.';
  END IF;

  -- 4. Validar multiempresa: usuario y turno deben pertenecer a la misma empresa
  SELECT e.empresa_id INTO v_usuario_empresa
  FROM public.perfiles p
  JOIN public.sucursales e ON e.id = p.sucursal_id
  WHERE p.id = p_usuario_id;

  SELECT s.empresa_id INTO v_turno_empresa
  FROM public.caja_turnos ct
  JOIN public.sucursales s ON s.id = ct.sucursal_id
  WHERE ct.id = p_turno_id;

  IF v_usuario_empresa IS DISTINCT FROM v_turno_empresa THEN
    RAISE EXCEPTION 'El usuario y el turno pertenecen a empresas diferentes.';
  END IF;

  -- 5. Validar items pertenecen a la sucursal/empresa
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

  -- 6. Determinar método de pago principal
  IF jsonb_array_length(p_pagos) = 1 THEN
    v_metodo_principal := p_pagos->0->>'metodo_pago';
  ELSE
    v_metodo_principal := 'mixto';
  END IF;

  -- 7. Obtener moneda de la sucursal
  SELECT moneda_simbolo INTO v_moneda_sucursal FROM public.configuraciones WHERE sucursal_id = p_sucursal_id LIMIT 1;
  IF v_moneda_sucursal IS NULL THEN v_moneda_sucursal := 'S/.'; END IF;

  -- 8. Calcular correlativo
  SELECT ticket_correlativo_inicial INTO v_correlativo_inicial FROM public.configuraciones WHERE sucursal_id = p_sucursal_id LIMIT 1;
  IF v_correlativo_inicial IS NULL OR v_correlativo_inicial <= 0 THEN v_correlativo_inicial := 1; END IF;

  SELECT COALESCE(MAX(correlativo), 0) INTO v_correlativo FROM public.ventas WHERE sucursal_id = p_sucursal_id;
  IF v_correlativo < v_correlativo_inicial THEN
    v_correlativo := v_correlativo_inicial;
  ELSE
    v_correlativo := v_correlativo + 1;
  END IF;

  -- 9. Insertar venta (con cliente)
  INSERT INTO public.ventas (sucursal_id, turno_id, usuario_id, metodo_pago, total, barbero_id, moneda, estado, cliente_id, cliente_nombre, correlativo)
  VALUES (p_sucursal_id, p_turno_id, p_usuario_id, v_metodo_principal, p_total, p_barbero_id, v_moneda_sucursal, 'completada', p_cliente_id, p_cliente_nombre, v_correlativo)
  RETURNING id INTO v_venta_id;

  -- 10. Insertar pagos y movimientos de caja
  FOR v_pago IN SELECT * FROM jsonb_to_recordset(p_pagos) AS p(metodo_pago VARCHAR, monto DECIMAL)
  LOOP
    INSERT INTO public.venta_pagos (venta_id, metodo_pago, monto)
    VALUES (v_venta_id, v_pago.metodo_pago, v_pago.monto);
    IF lower(v_pago.metodo_pago) = 'efectivo' THEN
      INSERT INTO public.caja_movimientos (turno_id, tipo, monto, motivo)
      VALUES (p_turno_id, 'ingreso_venta', v_pago.monto, 'Venta POS - Ticket #' || lpad(v_correlativo::text, 8, '0'));
    END IF;
  END LOOP;

  -- 11. Insertar detalles, descontar stock
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(item_id UUID, cantidad INT, precio_unitario DECIMAL)
  LOOP
    INSERT INTO public.venta_detalles (venta_id, item_id, cantidad, precio_unitario)
    VALUES (v_venta_id, v_item.item_id, v_item.cantidad, v_item.precio_unitario);

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
  END LOOP;

  RETURN v_venta_id;
END;
$function$;
