-- =============================================================
-- Migración 05: Multiempresa + Multi-Atención
-- =============================================================
-- PostgreSQL 17.6
-- =============================================================

-- 1. CREAR TABLA EMPRESAS
CREATE TABLE IF NOT EXISTS public.empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(200) NOT NULL,
    activa BOOLEAN DEFAULT true NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- 2. AGREGAR empresa_id A SUCURSALES
ALTER TABLE public.sucursales
ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;

-- 3. AGREGAR rol_sistema A PERFILES
ALTER TABLE public.perfiles
ADD COLUMN IF NOT EXISTS rol_sistema VARCHAR(20) DEFAULT NULL CHECK (rol_sistema IN ('sistema_admin'));

-- 4. MIGRAR DATOS EXISTENTES
-- 4a. Crear empresa por defecto
INSERT INTO public.empresas (id, nombre)
SELECT gen_random_uuid(), 'Barber Shop Test'
WHERE NOT EXISTS (SELECT 1 FROM public.empresas);

DO $$
DECLARE
    v_empresa_id UUID;
BEGIN
    SELECT id INTO v_empresa_id FROM public.empresas LIMIT 1;

    -- 4b. Asignar todas las sucursales existentes a la empresa por defecto
    UPDATE public.sucursales
    SET empresa_id = v_empresa_id
    WHERE empresa_id IS NULL;

    -- 4c. Asignar rol_sistema a admin@sellora.com
    UPDATE public.perfiles
    SET rol_sistema = 'sistema_admin'
    WHERE email = 'admin@sellora.com'
      AND rol_sistema IS NULL;
END $$;

-- 5. HACER empresa_id NOT NULL (después de migrar los datos)
ALTER TABLE public.sucursales
ALTER COLUMN empresa_id SET NOT NULL;

-- 6. ACTUALIZAR TRIGGER handle_new_user (PostgreSQL 17)
-- Ya lee raw_user_meta_data->>'sucursal_id', agregamos soporte para empresa_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    v_sucursal_id UUID;
    v_empresa_id UUID;
BEGIN
    v_sucursal_id := (new.raw_user_meta_data->>'sucursal_id')::UUID;
    v_empresa_id := (new.raw_user_meta_data->>'empresa_id')::UUID;

    -- Si no se especificó empresa_id, obtenerlo de la sucursal
    IF v_empresa_id IS NULL AND v_sucursal_id IS NOT NULL THEN
        SELECT empresa_id INTO v_empresa_id FROM public.sucursales WHERE id = v_sucursal_id;
    END IF;

    -- Fallback: si no hay sucursal ni empresa, asignar la primera sucursal de la primera empresa
    IF v_sucursal_id IS NULL THEN
        SELECT s.id, s.empresa_id INTO v_sucursal_id, v_empresa_id
        FROM public.sucursales s
        ORDER BY s.creado_en ASC
        LIMIT 1;
    END IF;

    INSERT INTO public.perfiles (id, nombre, rol, sucursal_id, comision_porcentaje, email)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'nombre', 'Usuario Nuevo'),
        COALESCE(new.raw_user_meta_data->>'rol', 'cajero'),
        v_sucursal_id,
        (new.raw_user_meta_data->>'comision_porcentaje')::DECIMAL,
        new.email
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RECREAR RPC procesar_venta_pos (7 params) CON VALIDACIÓN
-- Eliminar la versión vieja (5 params) para evitar ambigüedad
DROP FUNCTION IF EXISTS public.procesar_venta_pos(uuid, uuid, uuid, varchar, numeric, jsonb);

CREATE OR REPLACE FUNCTION public.procesar_venta_pos(
  p_sucursal_id UUID,
  p_turno_id UUID,
  p_usuario_id UUID,
  p_total DECIMAL,
  p_items JSONB,
  p_pagos JSONB,
  p_barbero_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_venta_id UUID;
  v_item RECORD;
  v_pago RECORD;
  v_comp RECORD;
  v_turno_estado VARCHAR;
  v_metodo_principal VARCHAR;
  v_moneda_sucursal VARCHAR(10);
  v_usuario_sucursal UUID;
BEGIN
  -- 1. Validar que el turno está abierto
  SELECT estado INTO v_turno_estado FROM public.caja_turnos WHERE id = p_turno_id;
  IF v_turno_estado IS NULL OR v_turno_estado <> 'abierto' THEN
    RAISE EXCEPTION 'El turno de caja no está abierto o no existe.';
  END IF;

  -- 2. VALIDACIÓN MULTIEMPRESA: verificar que p_sucursal_id coincida con el usuario
  SELECT sucursal_id INTO v_usuario_sucursal FROM public.perfiles WHERE id = p_usuario_id;
  IF v_usuario_sucursal IS NULL OR v_usuario_sucursal <> p_sucursal_id THEN
    RAISE EXCEPTION 'La sucursal no coincide con la del usuario.';
  END IF;

  -- 3. VALIDACIÓN MULTIEMPRESA: verificar que el turno pertenezca a la sucursal
  IF (SELECT sucursal_id FROM public.caja_turnos WHERE id = p_turno_id) <> p_sucursal_id THEN
    RAISE EXCEPTION 'El turno de caja no pertenece a la sucursal especificada.';
  END IF;

  -- 4. VALIDACIÓN MULTIEMPRESA: verificar que todos los items pertenezcan a la sucursal
  IF EXISTS (
    SELECT 1 FROM jsonb_to_recordset(p_items) AS x(item_id UUID)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.items WHERE id = x.item_id AND sucursal_id = p_sucursal_id
    )
  ) THEN
    RAISE EXCEPTION 'Uno o más items no pertenecen a la sucursal especificada.';
  END IF;

  -- 5. Determinar método de pago principal
  IF jsonb_array_length(p_pagos) = 1 THEN
    v_metodo_principal := p_pagos->0->>'metodo_pago';
  ELSE
    v_metodo_principal := 'mixto';
  END IF;

  -- 6. Obtener moneda de la sucursal
  SELECT moneda INTO v_moneda_sucursal FROM public.configuraciones WHERE sucursal_id = p_sucursal_id LIMIT 1;
  IF v_moneda_sucursal IS NULL THEN
    v_moneda_sucursal := 'USD';
  END IF;

  -- 7. Insertar cabecera de la venta
  INSERT INTO public.ventas (sucursal_id, turno_id, usuario_id, metodo_pago, total, barbero_id, moneda)
  VALUES (p_sucursal_id, p_turno_id, p_usuario_id, v_metodo_principal, p_total, p_barbero_id, v_moneda_sucursal)
  RETURNING id INTO v_venta_id;

  -- 8. Insertar pagos y registrar ingresos de efectivo
  FOR v_pago IN SELECT * FROM jsonb_to_recordset(p_pagos) AS p(metodo_pago VARCHAR, monto DECIMAL)
  LOOP
    INSERT INTO public.venta_pagos (venta_id, metodo_pago, monto)
    VALUES (v_venta_id, v_pago.metodo_pago, v_pago.monto);

    IF lower(v_pago.metodo_pago) = 'efectivo' THEN
      INSERT INTO public.caja_movimientos (turno_id, tipo, monto, motivo)
      VALUES (p_turno_id, 'ingreso_venta', v_pago.monto, 'Venta POS - Ticket ID: ' || v_venta_id);
    END IF;
  END LOOP;

  -- 9. Recorrer items y descontar stock
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(item_id UUID, cantidad INT, precio_unitario DECIMAL)
  LOOP
    INSERT INTO public.venta_detalles (venta_id, item_id, cantidad, precio_unitario)
    VALUES (v_venta_id, v_item.item_id, v_item.cantidad, v_item.precio_unitario);

    -- Descontar stock con FOR UPDATE implícito
    IF (SELECT tipo FROM public.items WHERE id = v_item.item_id) = 'producto' THEN
      UPDATE public.items 
      SET stock_actual = stock_actual - v_item.cantidad 
      WHERE id = v_item.item_id AND stock_actual >= v_item.cantidad;
      
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Stock insuficiente para el item %.', v_item.item_id;
      END IF;
    
    ELSIF (SELECT tipo FROM public.items WHERE id = v_item.item_id) = 'kit' THEN
      FOR v_comp IN SELECT componente_hijo_id, cantidad_requerida FROM public.kit_composicion WHERE kit_padre_id = v_item.item_id
      LOOP
        IF (SELECT tipo FROM public.items WHERE id = v_comp.componente_hijo_id) = 'producto' THEN
          UPDATE public.items 
          SET stock_actual = stock_actual - (v_comp.cantidad_requerida * v_item.cantidad)
          WHERE id = v_comp.componente_hijo_id AND stock_actual >= (v_comp.cantidad_requerida * v_item.cantidad);
          
          IF NOT FOUND THEN
            RAISE EXCEPTION 'Stock insuficiente para el componente % del kit %.', v_comp.componente_hijo_id, v_item.item_id;
          END IF;
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  RETURN v_venta_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. NOTA: Las vistas existentes se ELIMINARON primero (DROP VIEW IF EXISTS ... CASCADE)
--    porque CREATE OR REPLACE VIEW falla si se modifican columnas en PostgreSQL.
--    Luego se recrearon con security_invoker = true.
DROP VIEW IF EXISTS public.vista_comisiones_barberos CASCADE;
DROP VIEW IF EXISTS public.vista_reporte_ventas CASCADE;
DROP VIEW IF EXISTS public.vista_stock_kits CASCADE;

-- Vista stock kits
CREATE VIEW public.vista_stock_kits
WITH (security_invoker = true)
AS
WITH kit_stock_por_componente AS (
  SELECT 
    kc.kit_padre_id,
    FLOOR(c.stock_actual / kc.cantidad_requerida) AS stock_posible_por_componente
  FROM public.kit_composicion kc
  JOIN public.items c ON kc.componente_hijo_id = c.id
  WHERE c.tipo = 'producto'
)
SELECT 
  p.id AS kit_id,
  COALESCE(MIN(kspc.stock_posible_por_componente), 0)::INTEGER AS stock_calculado
FROM public.items p
LEFT JOIN kit_stock_por_componente kspc ON p.id = kspc.kit_padre_id
WHERE p.tipo = 'kit'
GROUP BY p.id;

-- Vista reporte ventas
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
    SELECT string_agg(i.nombre || ' x' || vd.cantidad::text, ', ')
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

-- Vista comisiones barberos
CREATE OR REPLACE VIEW public.vista_comisiones_barberos
WITH (security_invoker = true)
AS
SELECT 
  p.id AS barbero_id,
  p.nombre AS barbero_nombre,
  v.id AS venta_id,
  v.creado_en AS venta_fecha,
  v.sucursal_id,
  vd.id AS detalle_id,
  i.nombre AS item_nombre,
  vd.cantidad,
  vd.precio_unitario,
  (vd.cantidad * vd.precio_unitario) AS total_linea,
  ((vd.cantidad * vd.precio_unitario) * COALESCE(p.comision_porcentaje, 0) / 100.0)::DECIMAL(10,2) AS comision
FROM public.perfiles p
JOIN public.ventas v ON v.barbero_id = p.id
JOIN public.venta_detalles vd ON vd.venta_id = v.id
JOIN public.items i ON i.id = vd.item_id AND i.tipo = 'servicio';

-- 9. AGREGAR POLÍTICAS RLS DE BYPASS PARA sistema_admin
-- Función helper para verificar si el usuario es sistema_admin
CREATE OR REPLACE FUNCTION public.es_sistema_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.perfiles 
    WHERE id = auth.uid() AND rol_sistema = 'sistema_admin'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Política de bypass en empresas (sistema_admin puede todo)
CREATE POLICY "sistema_admin bypass" ON public.empresas
  FOR ALL TO authenticated USING (public.es_sistema_admin());

-- Asegurar que usuarios de empresa puedan leer sus propias empresas
-- Esto se hace indirectamente a través de sucursales, pero damos acceso básico
CREATE POLICY "Lectura empresas por sucursal" ON public.empresas
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.sucursales s
      JOIN public.perfiles p ON p.id = auth.uid()
      WHERE s.empresa_id = public.empresas.id AND s.id = p.sucursal_id
    )
  );

-- sucursales: permitir sistema_admin acceso total
DROP POLICY IF EXISTS "Allow public read access to sucursales" ON public.sucursales;
CREATE POLICY "Lectura pública sucursales" ON public.sucursales
  FOR SELECT TO public USING (true);

CREATE POLICY "sistema_admin bypass sucursales" ON public.sucursales
  FOR ALL TO authenticated USING (public.es_sistema_admin());

-- perfiles: permitir sistema_admin acceso total
DROP POLICY IF EXISTS "Permitir lectura de perfiles a usuarios autenticados" ON public.perfiles;
CREATE POLICY "Lectura perfiles autenticados" ON public.perfiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "sistema_admin bypass perfiles" ON public.perfiles
  FOR ALL TO authenticated USING (public.es_sistema_admin());

-- items: agregar bypass
DROP POLICY IF EXISTS "Acceso a items filtrado por sucursal" ON public.items;
CREATE POLICY "Acceso items por sucursal" ON public.items
  FOR ALL TO authenticated USING (
    sucursal_id = (SELECT sucursal_id FROM public.perfiles WHERE id = auth.uid())
  );
CREATE POLICY "sistema_admin bypass items" ON public.items
  FOR ALL TO authenticated USING (public.es_sistema_admin());

-- caja_turnos: agregar bypass
DROP POLICY IF EXISTS "Acceso a turnos de caja filtrado por sucursal" ON public.caja_turnos;
CREATE POLICY "Acceso turnos por sucursal" ON public.caja_turnos
  FOR ALL TO authenticated USING (
    sucursal_id = (SELECT sucursal_id FROM public.perfiles WHERE id = auth.uid())
  );
CREATE POLICY "sistema_admin bypass caja_turnos" ON public.caja_turnos
  FOR ALL TO authenticated USING (public.es_sistema_admin());

-- caja_movimientos: agregar bypass
DROP POLICY IF EXISTS "Aislamiento Sucursal Movimientos Caja" ON public.caja_movimientos;
CREATE POLICY "Acceso movimientos por sucursal" ON public.caja_movimientos
  FOR ALL TO authenticated USING (
    (SELECT sucursal_id FROM public.caja_turnos WHERE id = turno_id) = 
    (SELECT sucursal_id FROM public.perfiles WHERE id = auth.uid())
  );
CREATE POLICY "sistema_admin bypass caja_movimientos" ON public.caja_movimientos
  FOR ALL TO authenticated USING (public.es_sistema_admin());

-- ventas: agregar bypass
DROP POLICY IF EXISTS "Aislamiento Sucursal Ventas" ON public.ventas;
CREATE POLICY "Acceso ventas por sucursal" ON public.ventas
  FOR ALL TO authenticated USING (
    sucursal_id = (SELECT sucursal_id FROM public.perfiles WHERE id = auth.uid())
  );
CREATE POLICY "sistema_admin bypass ventas" ON public.ventas
  FOR ALL TO authenticated USING (public.es_sistema_admin());

-- venta_detalles: agregar bypass
DROP POLICY IF EXISTS "Aislamiento Sucursal Detalles Venta" ON public.venta_detalles;
CREATE POLICY "Acceso detalles venta por sucursal" ON public.venta_detalles
  FOR ALL TO authenticated USING (
    (SELECT sucursal_id FROM public.ventas WHERE id = venta_id) = 
    (SELECT sucursal_id FROM public.perfiles WHERE id = auth.uid())
  );
CREATE POLICY "sistema_admin bypass venta_detalles" ON public.venta_detalles
  FOR ALL TO authenticated USING (public.es_sistema_admin());

-- venta_pagos: agregar bypass
DROP POLICY IF EXISTS "Permitir lectura de pagos a empleados de la sucursal" ON public.venta_pagos;
DROP POLICY IF EXISTS "Permitir inserción de pagos a empleados de la sucursal" ON public.venta_pagos;
CREATE POLICY "Lectura pagos por sucursal" ON public.venta_pagos
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.ventas v
      JOIN public.perfiles p ON p.id = auth.uid()
      WHERE v.id = venta_id AND v.sucursal_id = p.sucursal_id
    )
  );
CREATE POLICY "Inserción pagos por sucursal" ON public.venta_pagos
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ventas v
      JOIN public.perfiles p ON p.id = auth.uid()
      WHERE v.id = venta_id AND v.sucursal_id = p.sucursal_id
    )
  );
CREATE POLICY "sistema_admin bypass venta_pagos" ON public.venta_pagos
  FOR ALL TO authenticated USING (public.es_sistema_admin());

-- proveedores: agregar bypass
DROP POLICY IF EXISTS "Aislamiento Sucursal Proveedores" ON public.proveedores;
CREATE POLICY "Acceso proveedores por sucursal" ON public.proveedores
  FOR ALL TO authenticated USING (
    sucursal_id = (SELECT sucursal_id FROM public.perfiles WHERE id = auth.uid())
  );
CREATE POLICY "sistema_admin bypass proveedores" ON public.proveedores
  FOR ALL TO authenticated USING (public.es_sistema_admin());

-- compras: agregar bypass
DROP POLICY IF EXISTS "Aislamiento Sucursal Compras" ON public.compras;
CREATE POLICY "Acceso compras por sucursal" ON public.compras
  FOR ALL TO authenticated USING (
    sucursal_id = (SELECT sucursal_id FROM public.perfiles WHERE id = auth.uid())
  );
CREATE POLICY "sistema_admin bypass compras" ON public.compras
  FOR ALL TO authenticated USING (public.es_sistema_admin());

-- compra_detalles: agregar bypass
DROP POLICY IF EXISTS "Aislamiento Sucursal Detalles Compra" ON public.compra_detalles;
CREATE POLICY "Acceso detalles compra por sucursal" ON public.compra_detalles
  FOR ALL TO authenticated USING (
    (SELECT sucursal_id FROM public.compras WHERE id = compra_id) = 
    (SELECT sucursal_id FROM public.perfiles WHERE id = auth.uid())
  );
CREATE POLICY "sistema_admin bypass compra_detalles" ON public.compra_detalles
  FOR ALL TO authenticated USING (public.es_sistema_admin());

-- configuraciones: agregar bypass
DROP POLICY IF EXISTS "Lectura de configuraciones por sucursal" ON public.configuraciones;
DROP POLICY IF EXISTS "Modificación de configuraciones por administradores" ON public.configuraciones;
CREATE POLICY "Lectura config por sucursal" ON public.configuraciones
  FOR SELECT TO authenticated USING (
    sucursal_id = (SELECT sucursal_id FROM public.perfiles WHERE id = auth.uid())
  );
CREATE POLICY "Modificación config por admin" ON public.configuraciones
  FOR ALL TO authenticated USING (
    sucursal_id = (SELECT sucursal_id FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin')
  ) WITH CHECK (
    sucursal_id = (SELECT sucursal_id FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin')
  );
CREATE POLICY "sistema_admin bypass configuraciones" ON public.configuraciones
  FOR ALL TO authenticated USING (public.es_sistema_admin());

-- asistencia: agregar bypass
DROP POLICY IF EXISTS "Aislamiento Sucursal Asistencia" ON public.asistencia;
CREATE POLICY "Acceso asistencia por sucursal" ON public.asistencia
  FOR ALL TO authenticated USING (
    sucursal_id = (SELECT sucursal_id FROM public.perfiles WHERE id = auth.uid())
  );
CREATE POLICY "sistema_admin bypass asistencia" ON public.asistencia
  FOR ALL TO authenticated USING (public.es_sistema_admin());

-- inventario_movimientos: agregar bypass
DROP POLICY IF EXISTS "select_inventario_movimientos" ON public.inventario_movimientos;
DROP POLICY IF EXISTS "insert_inventario_movimientos" ON public.inventario_movimientos;
DROP POLICY IF EXISTS "delete_inventario_movimientos" ON public.inventario_movimientos;
CREATE POLICY "Lectura inventario movimientos" ON public.inventario_movimientos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Inserción inventario movimientos por admin" ON public.inventario_movimientos
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin')
  );
CREATE POLICY "Eliminación inventario movimientos por admin" ON public.inventario_movimientos
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin')
  );
CREATE POLICY "sistema_admin bypass inventario_movimientos" ON public.inventario_movimientos
  FOR ALL TO authenticated USING (public.es_sistema_admin());

-- kit_composicion: agregar bypass
DROP POLICY IF EXISTS "select_kit_composicion" ON public.kit_composicion;
DROP POLICY IF EXISTS "insert_kit_composicion" ON public.kit_composicion;
DROP POLICY IF EXISTS "update_kit_composicion" ON public.kit_composicion;
DROP POLICY IF EXISTS "delete_kit_composicion" ON public.kit_composicion;
CREATE POLICY "Lectura kit composicion" ON public.kit_composicion
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Inserción kit composicion por admin" ON public.kit_composicion
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin')
  );
CREATE POLICY "Actualización kit composicion por admin" ON public.kit_composicion
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin')
  );
CREATE POLICY "Eliminación kit composicion por admin" ON public.kit_composicion
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin')
  );
CREATE POLICY "sistema_admin bypass kit_composicion" ON public.kit_composicion
  FOR ALL TO authenticated USING (public.es_sistema_admin());

-- 10. AGREGAR ÍNDICES
CREATE INDEX IF NOT EXISTS idx_sucursales_empresa ON public.sucursales(empresa_id);
CREATE INDEX IF NOT EXISTS idx_perfiles_rol_sistema ON public.perfiles(rol_sistema);
CREATE INDEX IF NOT EXISTS idx_perfiles_sucursal ON public.perfiles(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_items_sucursal_tipo ON public.items(sucursal_id, tipo);
CREATE INDEX IF NOT EXISTS idx_ventas_sucursal_creado ON public.ventas(sucursal_id, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_caja_turnos_sucursal_estado ON public.caja_turnos(sucursal_id, estado);
CREATE INDEX IF NOT EXISTS idx_kit_composicion_padre ON public.kit_composicion(kit_padre_id);
CREATE INDEX IF NOT EXISTS idx_kit_composicion_hijo ON public.kit_composicion(componente_hijo_id);
CREATE INDEX IF NOT EXISTS idx_caja_movimientos_turno ON public.caja_movimientos(turno_id);
CREATE INDEX IF NOT EXISTS idx_venta_detalles_venta ON public.venta_detalles(venta_id);
CREATE INDEX IF NOT EXISTS idx_inventario_movimientos_item ON public.inventario_movimientos(item_id, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_empresas_activa ON public.empresas(activa);

-- 11. RPC para crear empresa (usado por EmpresaManager)
CREATE OR REPLACE FUNCTION public.crear_empresa_db(
    p_empresa_nombre VARCHAR(200),
    p_sucursal_nombre VARCHAR(200)
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_empresa_id UUID;
    v_sucursal_id UUID;
BEGIN
    INSERT INTO public.empresas (nombre)
    VALUES (p_empresa_nombre)
    RETURNING id INTO v_empresa_id;

    INSERT INTO public.sucursales (nombre, empresa_id)
    VALUES (p_sucursal_nombre, v_empresa_id)
    RETURNING id INTO v_sucursal_id;

    RETURN jsonb_build_object(
        'empresa_id', v_empresa_id,
        'sucursal_id', v_sucursal_id
    );
END;
$$;;
