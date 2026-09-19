-- =============================================================
-- Migración 19: Ventas al Crédito y Cuentas por Cobrar
-- =============================================================
-- PostgreSQL 17.6
-- =============================================================

-- 1. EXTENDER TABLA public.ventas
ALTER TABLE public.ventas 
ADD COLUMN IF NOT EXISTS condicion_venta VARCHAR(10) NOT NULL DEFAULT 'contado',
ADD COLUMN IF NOT EXISTS estado_pago VARCHAR(20) NOT NULL DEFAULT 'pagado',
ADD COLUMN IF NOT EXISTS monto_pagado DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS saldo_pendiente DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Restricciones de validación
ALTER TABLE public.ventas DROP CONSTRAINT IF EXISTS chk_ventas_condicion;
ALTER TABLE public.ventas ADD CONSTRAINT chk_ventas_condicion CHECK (condicion_venta IN ('contado', 'credito'));

ALTER TABLE public.ventas DROP CONSTRAINT IF EXISTS chk_ventas_estado_pago;
ALTER TABLE public.ventas ADD CONSTRAINT chk_ventas_estado_pago CHECK (estado_pago IN ('pagado', 'parcial', 'pendiente'));

-- Migrar datos históricos para mantener integridad (todas las ventas pasadas son al contado y pagadas)
UPDATE public.ventas
SET 
  condicion_venta = 'contado',
  estado_pago = 'pagado',
  monto_pagado = total,
  saldo_pendiente = 0
WHERE condicion_venta IS NULL OR monto_pagado = 0;

-- 2. TABLA public.venta_cuotas (Plan de Cuotas para Ventas al Crédito)
CREATE TABLE IF NOT EXISTS public.venta_cuotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venta_id UUID NOT NULL REFERENCES public.ventas(id) ON DELETE CASCADE,
    sucursal_id UUID NOT NULL REFERENCES public.sucursales(id) ON DELETE CASCADE,
    numero_cuota INT NOT NULL,
    monto DECIMAL(10,2) NOT NULL CHECK (monto >= 0),
    monto_pagado DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (monto_pagado >= 0),
    fecha_vencimiento DATE NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'parcial', 'pagada')),
    creado_en TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_venta_cuotas_venta_id ON public.venta_cuotas(venta_id);
CREATE INDEX IF NOT EXISTS idx_venta_cuotas_sucursal_id ON public.venta_cuotas(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_venta_cuotas_vencimiento ON public.venta_cuotas(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_venta_cuotas_estado ON public.venta_cuotas(estado);

-- RLS en venta_cuotas
ALTER TABLE public.venta_cuotas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acceso cuotas por sucursal" ON public.venta_cuotas;
CREATE POLICY "Acceso cuotas por sucursal" ON public.venta_cuotas
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = auth.uid() AND (p.sucursal_id = venta_cuotas.sucursal_id OR p.rol_sistema = 'sistema_admin')
    )
  );

-- 3. TABLA public.venta_abonos (Historial de Pagos / Recibos de Amortización)
CREATE TABLE IF NOT EXISTS public.venta_abonos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venta_id UUID NOT NULL REFERENCES public.ventas(id) ON DELETE CASCADE,
    cuota_id UUID REFERENCES public.venta_cuotas(id) ON DELETE SET NULL,
    sucursal_id UUID NOT NULL REFERENCES public.sucursales(id) ON DELETE CASCADE,
    turno_id UUID REFERENCES public.caja_turnos(id) ON DELETE SET NULL,
    usuario_id UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE RESTRICT,
    monto DECIMAL(10,2) NOT NULL CHECK (monto > 0),
    metodo_pago VARCHAR(20) NOT NULL,
    notas TEXT,
    creado_en TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_venta_abonos_venta_id ON public.venta_abonos(venta_id);
CREATE INDEX IF NOT EXISTS idx_venta_abonos_sucursal_id ON public.venta_abonos(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_venta_abonos_turno_id ON public.venta_abonos(turno_id);

-- RLS en venta_abonos
ALTER TABLE public.venta_abonos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acceso abonos por sucursal" ON public.venta_abonos;
CREATE POLICY "Acceso abonos por sucursal" ON public.venta_abonos
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = auth.uid() AND (p.sucursal_id = venta_abonos.sucursal_id OR p.rol_sistema = 'sistema_admin')
    )
  );

-- 4. ACTUALIZAR VISTA public.vista_reporte_ventas
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
  v.cliente_id,
  v.cliente_nombre,
  v.correlativo,
  v.estado,
  v.condicion_venta,
  v.estado_pago,
  v.monto_pagado,
  v.saldo_pendiente,
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
LEFT JOIN public.perfiles p_cajero ON p_cajero.id = v.usuario_id
LEFT JOIN public.perfiles p_barbero ON p_barbero.id = v.barbero_id
LEFT JOIN public.sucursales s ON s.id = v.sucursal_id
LEFT JOIN public.configuraciones conf ON conf.sucursal_id = v.sucursal_id;

-- 5. ACTUALIZAR RPC procesar_venta_pos
CREATE OR REPLACE FUNCTION public.procesar_venta_pos(
  p_sucursal_id UUID,
  p_turno_id UUID,
  p_usuario_id UUID,
  p_total DECIMAL,
  p_items JSONB,
  p_pagos JSONB,
  p_barbero_id UUID DEFAULT NULL,
  p_cliente_id UUID DEFAULT NULL,
  p_cliente_nombre VARCHAR DEFAULT NULL,
  p_condicion_venta VARCHAR DEFAULT 'contado',
  p_cuotas JSONB DEFAULT NULL
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
  v_cuota RECORD;
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
  v_monto_inicial DECIMAL(10,2) := 0;
  v_saldo_pendiente DECIMAL(10,2) := 0;
  v_estado_pago VARCHAR(20) := 'pagado';
  v_pago_count INT := 0;
BEGIN
  -- 1. Validar turno: permitir turnos manuales/históricos (cerrados con es_manual=true)
  SELECT estado, COALESCE(es_manual, false)
  INTO v_turno_estado, v_turno_es_manual
  FROM public.caja_turnos WHERE id = p_turno_id;

  IF v_turno_estado IS NULL THEN
    RAISE EXCEPTION 'El turno de caja no existe.';
  END IF;

  IF NOT v_turno_es_manual AND v_turno_estado <> 'abierto' THEN
    RAISE EXCEPTION 'El turno de caja no está abierto o no existe.';
  END IF;

  -- 2. Validar sucursal del usuario
  SELECT sucursal_id, rol INTO v_usuario_sucursal, v_usuario_rol
  FROM public.perfiles WHERE id = p_usuario_id;

  IF v_usuario_rol <> 'admin' THEN
    IF v_usuario_sucursal IS NULL OR v_usuario_sucursal <> p_sucursal_id THEN
      RAISE EXCEPTION 'La sucursal no coincide con la del usuario.';
    END IF;
  END IF;

  -- 3. Validar que el turno pertenezca a la sucursal indicada
  IF (SELECT sucursal_id FROM public.caja_turnos WHERE id = p_turno_id) <> p_sucursal_id THEN
    RAISE EXCEPTION 'El turno de caja no pertenece a la sucursal especificada.';
  END IF;

  -- 4. Validar multiempresa
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

  -- 6. Validar cliente obligatorio para crédito
  IF p_condicion_venta = 'credito' THEN
    IF p_cliente_nombre IS NULL OR trim(p_cliente_nombre) = '' OR lower(trim(p_cliente_nombre)) = 'cliente general' THEN
      RAISE EXCEPTION 'Para ventas al crédito es obligatorio ingresar el nombre del cliente.';
    END IF;
  END IF;

  -- 7. Calcular montos de pago y saldo
  v_pago_count := COALESCE(jsonb_array_length(p_pagos), 0);

  IF v_pago_count > 0 THEN
    SELECT COALESCE(SUM(monto), 0) INTO v_monto_inicial
    FROM jsonb_to_recordset(p_pagos) AS p(monto DECIMAL);
  ELSE
    v_monto_inicial := 0;
  END IF;

  IF p_condicion_venta = 'credito' THEN
    v_saldo_pendiente := GREATEST(p_total - v_monto_inicial, 0);
    IF v_saldo_pendiente <= 0 THEN
      v_estado_pago := 'pagado';
    ELSIF v_monto_inicial > 0 THEN
      v_estado_pago := 'parcial';
    ELSE
      v_estado_pago := 'pendiente';
    END IF;

    IF v_pago_count = 0 THEN
      v_metodo_principal := 'credito';
    ELSIF v_pago_count = 1 THEN
      v_metodo_principal := p_pagos->0->>'metodo_pago';
    ELSE
      v_metodo_principal := 'mixto';
    END IF;
  ELSE
    -- Venta al contado
    v_monto_inicial := p_total;
    v_saldo_pendiente := 0;
    v_estado_pago := 'pagado';

    IF v_pago_count = 1 THEN
      v_metodo_principal := p_pagos->0->>'metodo_pago';
    ELSE
      v_metodo_principal := 'mixto';
    END IF;
  END IF;

  -- 8. Obtener moneda de la sucursal
  SELECT moneda_simbolo INTO v_moneda_sucursal FROM public.configuraciones WHERE sucursal_id = p_sucursal_id LIMIT 1;
  IF v_moneda_sucursal IS NULL THEN v_moneda_sucursal := 'S/.'; END IF;

  -- 9. Calcular correlativo
  SELECT ticket_correlativo_inicial INTO v_correlativo_inicial FROM public.configuraciones WHERE sucursal_id = p_sucursal_id LIMIT 1;
  IF v_correlativo_inicial IS NULL OR v_correlativo_inicial <= 0 THEN v_correlativo_inicial := 1; END IF;

  SELECT COALESCE(MAX(correlativo), 0) INTO v_correlativo FROM public.ventas WHERE sucursal_id = p_sucursal_id;
  IF v_correlativo < v_correlativo_inicial THEN
    v_correlativo := v_correlativo_inicial;
  ELSE
    v_correlativo := v_correlativo + 1;
  END IF;

  -- 10. Insertar venta
  INSERT INTO public.ventas (
    sucursal_id, turno_id, usuario_id, metodo_pago, total, barbero_id, 
    moneda, estado, cliente_id, cliente_nombre, correlativo,
    condicion_venta, estado_pago, monto_pagado, saldo_pendiente
  )
  VALUES (
    p_sucursal_id, p_turno_id, p_usuario_id, v_metodo_principal, p_total, p_barbero_id, 
    v_moneda_sucursal, 'completada', p_cliente_id, p_cliente_nombre, v_correlativo,
    COALESCE(p_condicion_venta, 'contado'), v_estado_pago, v_monto_inicial, v_saldo_pendiente
  )
  RETURNING id INTO v_venta_id;

  -- 11. Insertar pagos recibidos y movimientos de caja
  IF v_pago_count > 0 THEN
    FOR v_pago IN SELECT * FROM jsonb_to_recordset(p_pagos) AS p(metodo_pago VARCHAR, monto DECIMAL)
    LOOP
      INSERT INTO public.venta_pagos (venta_id, metodo_pago, monto)
      VALUES (v_venta_id, v_pago.metodo_pago, v_pago.monto);

      -- Si es crédito, registrar también en venta_abonos como anticipo inicial
      IF p_condicion_venta = 'credito' AND v_pago.monto > 0 THEN
        INSERT INTO public.venta_abonos (venta_id, sucursal_id, turno_id, usuario_id, monto, metodo_pago, notas)
        VALUES (v_venta_id, p_sucursal_id, p_turno_id, p_usuario_id, v_pago.monto, v_pago.metodo_pago, 'Abono Inicial / Enganche');
      END IF;

      -- En caja solo ingresa lo pagado en efectivo hoy
      IF lower(v_pago.metodo_pago) = 'efectivo' AND v_pago.monto > 0 THEN
        INSERT INTO public.caja_movimientos (turno_id, tipo, monto, motivo)
        VALUES (
          p_turno_id, 
          'ingreso_venta', 
          v_pago.monto, 
          CASE 
            WHEN p_condicion_venta = 'credito' THEN 'Venta Crédito (Inicial) - Ticket #' || lpad(v_correlativo::text, 8, '0')
            ELSE 'Venta POS - Ticket #' || lpad(v_correlativo::text, 8, '0')
          END
        );
      END IF;
    END LOOP;
  END IF;

  -- 12. Insertar cuotas programadas si es crédito
  IF p_condicion_venta = 'credito' AND p_cuotas IS NOT NULL AND jsonb_array_length(p_cuotas) > 0 THEN
    FOR v_cuota IN SELECT * FROM jsonb_to_recordset(p_cuotas) AS c(
      numero_cuota INT, monto DECIMAL, fecha_vencimiento DATE
    )
    LOOP
      INSERT INTO public.venta_cuotas (
        venta_id, sucursal_id, numero_cuota, monto, monto_pagado, fecha_vencimiento, estado
      )
      VALUES (
        v_venta_id, p_sucursal_id, v_cuota.numero_cuota, v_cuota.monto, 0, v_cuota.fecha_vencimiento, 'pendiente'
      );
    END LOOP;
  END IF;

  -- 13. Insertar detalles de items y descontar stock
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(item_id UUID, cantidad INT, precio_unitario DECIMAL, presentacion_id UUID, presentacion_nombre VARCHAR)
  LOOP
    INSERT INTO public.venta_detalles (venta_id, item_id, cantidad, precio_unitario, presentacion_id, presentacion_nombre)
    VALUES (v_venta_id, v_item.item_id, v_item.cantidad, v_item.precio_unitario, v_item.presentacion_id, v_item.presentacion_nombre);

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

-- 6. RPC registrar_abono_credito
CREATE OR REPLACE FUNCTION public.registrar_abono_credito(
  p_venta_id UUID,
  p_sucursal_id UUID,
  p_usuario_id UUID,
  p_monto DECIMAL,
  p_metodo_pago VARCHAR,
  p_turno_id UUID DEFAULT NULL,
  p_cuota_id UUID DEFAULT NULL,
  p_notas TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_venta RECORD;
  v_nuevo_saldo DECIMAL(10,2);
  v_nuevo_pagado DECIMAL(10,2);
  v_nuevo_estado VARCHAR(20);
  v_abono_id UUID;
  v_monto_restante DECIMAL(10,2);
  v_cuota RECORD;
  v_amortizar DECIMAL(10,2);
BEGIN
  -- Validar monto
  IF p_monto <= 0 THEN
    RAISE EXCEPTION 'El monto del abono debe ser mayor a 0.';
  END IF;

  -- Obtener y bloquear venta para concurrencia segura
  SELECT id, total, monto_pagado, saldo_pendiente, estado_pago, correlativo, sucursal_id
  INTO v_venta
  FROM public.ventas
  WHERE id = p_venta_id FOR UPDATE;

  IF v_venta.id IS NULL THEN
    RAISE EXCEPTION 'La venta especificada no existe.';
  END IF;

  IF v_venta.saldo_pendiente <= 0 THEN
    RAISE EXCEPTION 'Esta venta ya no cuenta con saldo pendiente por cobrar.';
  END IF;

  IF p_monto > v_venta.saldo_pendiente THEN
    RAISE EXCEPTION 'El abono (S/ %) supera el saldo pendiente (S/ %).', p_monto, v_venta.saldo_pendiente;
  END IF;

  -- Calcular nuevos balances
  v_nuevo_saldo := v_venta.saldo_pendiente - p_monto;
  v_nuevo_pagado := v_venta.monto_pagado + p_monto;

  IF v_nuevo_saldo <= 0 THEN
    v_nuevo_estado := 'pagado';
    v_nuevo_saldo := 0;
  ELSE
    v_nuevo_estado := 'parcial';
  END IF;

  -- Actualizar venta
  UPDATE public.ventas
  SET 
    monto_pagado = v_nuevo_pagado,
    saldo_pendiente = v_nuevo_saldo,
    estado_pago = v_nuevo_estado
  WHERE id = p_venta_id;

  -- Insertar abono
  INSERT INTO public.venta_abonos (
    venta_id, cuota_id, sucursal_id, turno_id, usuario_id, monto, metodo_pago, notas
  )
  VALUES (
    p_venta_id, p_cuota_id, p_sucursal_id, p_turno_id, p_usuario_id, p_monto, p_metodo_pago, p_notas
  )
  RETURNING id INTO v_abono_id;

  -- Amortizar cuotas
  IF p_cuota_id IS NOT NULL THEN
    UPDATE public.venta_cuotas
    SET 
      monto_pagado = monto_pagado + p_monto,
      estado = CASE WHEN (monto_pagado + p_monto) >= monto THEN 'pagada' ELSE 'parcial' END
    WHERE id = p_cuota_id;
  ELSE
    -- Amortización automática en cascada de cuotas pendientes más antiguas
    v_monto_restante := p_monto;
    FOR v_cuota IN 
      SELECT id, monto, monto_pagado 
      FROM public.venta_cuotas 
      WHERE venta_id = p_venta_id AND estado <> 'pagada'
      ORDER BY numero_cuota ASC 
    LOOP
      EXIT WHEN v_monto_restante <= 0;

      v_amortizar := LEAST(v_monto_restante, v_cuota.monto - v_cuota.monto_pagado);
      
      UPDATE public.venta_cuotas
      SET 
        monto_pagado = monto_pagado + v_amortizar,
        estado = CASE WHEN (monto_pagado + v_amortizar) >= monto THEN 'pagada' ELSE 'parcial' END
      WHERE id = v_cuota.id;

      v_monto_restante := v_monto_restante - v_amortizar;
    END LOOP;
  END IF;

  -- Registrar movimiento en caja si hay un turno abierto
  IF p_turno_id IS NOT NULL THEN
    IF lower(p_metodo_pago) = 'efectivo' THEN
      INSERT INTO public.caja_movimientos (turno_id, tipo, monto, motivo)
      VALUES (
        p_turno_id, 
        'ingreso_venta', 
        p_monto, 
        'Abono Crédito - Ticket #' || lpad(v_venta.correlativo::text, 8, '0')
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'abono_id', v_abono_id,
    'monto_abonado', p_monto,
    'saldo_pendiente', v_nuevo_saldo,
    'estado_pago', v_nuevo_estado
  );
END;
$function$;
