-- =============================================================
-- Migración 07: Preparación V2 — Permisos, Inventariable, Caja, Seguridad
-- =============================================================
-- PostgreSQL 17.6
-- =============================================================

-- =============================================================
-- 1. COLUMNAS NUEVAS EN TABLAS EXISTENTES
-- =============================================================

-- 1.1 Eliminar limite_efectivo_caja (no usado, no necesario)
ALTER TABLE public.configuraciones DROP COLUMN IF EXISTS limite_efectivo_caja;

-- 1.2 estado en ventas (para anulación)
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS estado VARCHAR(20) NOT NULL DEFAULT 'completada';
ALTER TABLE public.ventas DROP CONSTRAINT IF EXISTS chk_ventas_estado;
ALTER TABLE public.ventas ADD CONSTRAINT chk_ventas_estado CHECK (estado IN ('completada', 'anulada'));

-- 1.3 Columnas de auditoría de cierre en caja_turnos
ALTER TABLE public.caja_turnos ADD COLUMN IF NOT EXISTS monto_cierre_esperado DECIMAL(10,2);
ALTER TABLE public.caja_turnos ADD COLUMN IF NOT EXISTS diferencia_caja DECIMAL(10,2);

-- 1.4 Columna inventariable en items
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS inventariable BOOLEAN NOT NULL DEFAULT true;

-- Actualizar servicios existentes: no son inventariables
UPDATE public.items SET inventariable = false WHERE tipo = 'servicio';

-- =============================================================
-- 2. NUEVAS TABLAS
-- =============================================================

-- 2.1 Tokens de reset de password
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (timezone('utc'::text, now()) + interval '24 hours'),
    used_at TIMESTAMP WITH TIME ZONE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_password_reset_tokens_code ON public.password_reset_tokens(code);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON public.password_reset_tokens(user_id);

ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- 2.2 Solicitudes de movimientos de caja (aprobación)
CREATE TABLE IF NOT EXISTS public.movimientos_caja_solicitudes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    turno_id UUID NOT NULL REFERENCES public.caja_turnos(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE RESTRICT,
    aprobado_por UUID REFERENCES public.perfiles(id) ON DELETE SET NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('ingreso_manual', 'egreso_manual')),
    monto DECIMAL(10,2) NOT NULL CHECK (monto > 0),
    motivo TEXT NOT NULL,
    nota TEXT,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
    solicitado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    aprobado_en TIMESTAMP WITH TIME ZONE,
    comentario_admin TEXT
);

CREATE INDEX IF NOT EXISTS idx_mov_solicitudes_turno ON public.movimientos_caja_solicitudes(turno_id);
CREATE INDEX IF NOT EXISTS idx_mov_solicitudes_estado ON public.movimientos_caja_solicitudes(estado);

ALTER TABLE public.movimientos_caja_solicitudes ENABLE ROW LEVEL SECURITY;

-- 2.3 Permisos de usuario (matriz de toggles)
CREATE TABLE IF NOT EXISTS public.permisos_usuario (
    usuario_id UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
    permiso VARCHAR(50) NOT NULL,
    habilitado BOOLEAN NOT NULL DEFAULT true,
    PRIMARY KEY (usuario_id, permiso)
);

ALTER TABLE public.permisos_usuario ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- 3. TRIGGER: handle_new_user ESTRICTO (sin fallback)
-- =============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    v_sucursal_id UUID;
    v_empresa_id UUID;
BEGIN
    v_sucursal_id := (new.raw_user_meta_data->>'sucursal_id')::UUID;
    v_empresa_id := (new.raw_user_meta_data->>'empresa_id')::UUID;

    -- Validar que la sucursal existe
    IF v_sucursal_id IS NULL THEN
        RAISE EXCEPTION 'sucursal_id es requerido en raw_user_meta_data para crear un usuario.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.sucursales WHERE id = v_sucursal_id) THEN
        RAISE EXCEPTION 'La sucursal % no existe.', v_sucursal_id;
    END IF;

    -- Si no se pasa empresa_id, obtenerla de la sucursal
    IF v_empresa_id IS NULL THEN
        SELECT empresa_id INTO v_empresa_id FROM public.sucursales WHERE id = v_sucursal_id;
    END IF;

    -- Validar que la empresa existe
    IF NOT EXISTS (SELECT 1 FROM public.empresas WHERE id = v_empresa_id) THEN
        RAISE EXCEPTION 'La empresa % no existe.', v_empresa_id;
    END IF;

    -- Validar que la sucursal pertenece a la empresa
    IF NOT EXISTS (SELECT 1 FROM public.sucursales WHERE id = v_sucursal_id AND empresa_id = v_empresa_id) THEN
        RAISE EXCEPTION 'La sucursal % no pertenece a la empresa %.', v_sucursal_id, v_empresa_id;
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

-- Recrear el trigger (DROP + CREATE)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =============================================================
-- 4. TRIGGER: actualizar_stock_por_compra con validación de sucursal
-- =============================================================

CREATE OR REPLACE FUNCTION public.actualizar_stock_por_compra()
RETURNS trigger AS $$
BEGIN
    -- Validar que el item pertenece a la misma sucursal
    IF (SELECT sucursal_id FROM public.items WHERE id = NEW.item_id) !=
       (SELECT sucursal_id FROM public.compras WHERE id = NEW.compra_id) THEN
        RAISE EXCEPTION 'El item % no pertenece a la sucursal de la compra.', NEW.item_id;
    END IF;

    IF (SELECT tipo FROM public.items WHERE id = NEW.item_id) = 'producto' THEN
        UPDATE public.items SET stock_actual = stock_actual + NEW.cantidad WHERE id = NEW.item_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recrear trigger
DROP TRIGGER IF EXISTS trg_actualizar_stock_por_compra ON public.compra_detalles;
CREATE TRIGGER trg_actualizar_stock_por_compra
    AFTER INSERT ON public.compra_detalles
    FOR EACH ROW
    EXECUTE FUNCTION public.actualizar_stock_por_compra();

-- =============================================================
-- 5. RPC: procesar_venta_pos REFORZADO (multiempresa + inventariable)
-- =============================================================

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

    -- 4. Validar multiempresa: usuario, turno y sucursal deben pertenecer a la misma empresa
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

    -- 5. Validar que todos los items pertenecen a la sucursal y a la misma empresa
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

    -- 7. Obtener moneda de la sucursal
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

    -- 10. Insertar detalles y actualizar stock (solo si inventariable)
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(item_id UUID, cantidad INT, precio_unitario DECIMAL)
    LOOP
        INSERT INTO public.venta_detalles (venta_id, item_id, cantidad, precio_unitario)
        VALUES (v_venta_id, v_item.item_id, v_item.cantidad, v_item.precio_unitario);

        -- Solo afectar stock si el item es inventariable
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
$$;

-- =============================================================
-- 6. RPC: anular_venta_pos
-- =============================================================

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
    -- Validar que la venta existe y no está ya anulada
    SELECT estado, sucursal_id, turno_id INTO v_estado, v_sucursal_id, v_turno_id
    FROM public.ventas WHERE id = p_venta_id;
    IF v_estado IS NULL THEN
        RAISE EXCEPTION 'La venta % no existe.', p_venta_id;
    END IF;
    IF v_estado = 'anulada' THEN
        RAISE EXCEPTION 'La venta % ya fue anulada anteriormente.', p_venta_id;
    END IF;

    -- Marcar como anulada
    UPDATE public.ventas SET estado = 'anulada' WHERE id = p_venta_id;

    -- Revertir stock de cada detalle (solo si inventariable)
    FOR v_item IN
        SELECT vd.item_id, vd.cantidad, i.inventariable, i.tipo
        FROM public.venta_detalles vd
        JOIN public.items i ON i.id = vd.item_id
        WHERE vd.venta_id = p_venta_id
    LOOP
        IF v_item.inventariable AND v_item.tipo = 'producto' THEN
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

    -- Revertir pagos en efectivo (movimiento de egreso)
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

-- =============================================================
-- 7. RPC: crear_solicitud_movimiento_caja
-- =============================================================

CREATE OR REPLACE FUNCTION public.crear_solicitud_movimiento_caja(
    p_turno_id UUID,
    p_usuario_id UUID,
    p_tipo VARCHAR(20),
    p_monto DECIMAL,
    p_motivo TEXT,
    p_nota TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_solicitud_id UUID;
    v_usuario_sucursal UUID;
    v_turno_sucursal UUID;
    v_tiene_permiso BOOLEAN;
BEGIN
    -- Validar que el turno existe y está abierto
    IF NOT EXISTS (SELECT 1 FROM public.caja_turnos WHERE id = p_turno_id AND estado = 'abierto') THEN
        RAISE EXCEPTION 'El turno de caja no está abierto o no existe.';
    END IF;

    -- Validar multiempresa
    SELECT sucursal_id INTO v_usuario_sucursal FROM public.perfiles WHERE id = p_usuario_id;
    SELECT sucursal_id INTO v_turno_sucursal FROM public.caja_turnos WHERE id = p_turno_id;
    IF v_usuario_sucursal IS DISTINCT FROM v_turno_sucursal THEN
        RAISE EXCEPTION 'El turno no pertenece a la sucursal del usuario.';
    END IF;

    -- Verificar si el usuario puede registrar directamente o necesita aprobación
    SELECT EXISTS (SELECT 1 FROM public.permisos_usuario WHERE usuario_id = p_usuario_id AND permiso = 'registrar_movimiento_caja' AND habilitado = true)
    INTO v_tiene_permiso;

    IF v_tiene_permiso THEN
        -- Inserción directa
        INSERT INTO public.caja_movimientos (turno_id, tipo, monto, motivo)
        VALUES (p_turno_id, p_tipo, p_monto, p_motivo)
        RETURNING gen_random_uuid() INTO v_solicitud_id;
    ELSE
        -- Crear solicitud de aprobación
        INSERT INTO public.movimientos_caja_solicitudes (turno_id, usuario_id, tipo, monto, motivo, nota, estado)
        VALUES (p_turno_id, p_usuario_id, p_tipo, p_monto, p_motivo, p_nota, 'pendiente')
        RETURNING id INTO v_solicitud_id;
    END IF;

    RETURN v_solicitud_id;
END;
$$;

-- =============================================================
-- 8. RPC: aprobar_movimiento_caja
-- =============================================================

CREATE OR REPLACE FUNCTION public.aprobar_movimiento_caja(
    p_solicitud_id UUID,
    p_aprobador_id UUID,
    p_estado VARCHAR(20),
    p_comentario TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_solicitud RECORD;
    v_tiene_permiso BOOLEAN;
    v_aprobador_sucursal UUID;
BEGIN
    -- Validar que el aprobador tiene permiso
    SELECT EXISTS (
        SELECT 1 FROM public.permisos_usuario
        WHERE usuario_id = p_aprobador_id AND permiso = 'aprobar_movimiento_caja' AND habilitado = true
    ) OR EXISTS (
        SELECT 1 FROM public.perfiles WHERE id = p_aprobador_id AND rol = 'admin'
    ) INTO v_tiene_permiso;

    IF NOT v_tiene_permiso THEN
        RAISE EXCEPTION 'No tienes permiso para aprobar movimientos de caja.';
    END IF;

    -- Obtener la solicitud
    SELECT * INTO v_solicitud FROM public.movimientos_caja_solicitudes WHERE id = p_solicitud_id;
    IF v_solicitud.id IS NULL THEN
        RAISE EXCEPTION 'La solicitud % no existe.', p_solicitud_id;
    END IF;
    IF v_solicitud.estado != 'pendiente' THEN
        RAISE EXCEPTION 'La solicitud ya fue % .', v_solicitud.estado;
    END IF;

    -- Validar multiempresa
    SELECT sucursal_id INTO v_aprobador_sucursal FROM public.perfiles WHERE id = p_aprobador_id;
    IF (SELECT sucursal_id FROM public.caja_turnos WHERE id = v_solicitud.turno_id) != v_aprobador_sucursal THEN
        RAISE EXCEPTION 'La solicitud no pertenece a tu sucursal.';
    END IF;

    -- Actualizar solicitud
    UPDATE public.movimientos_caja_solicitudes
    SET estado = p_estado,
        aprobado_por = p_aprobador_id,
        aprobado_en = now(),
        comentario_admin = p_comentario
    WHERE id = p_solicitud_id;

    -- Si fue aprobado, registrar en caja_movimientos
    IF p_estado = 'aprobado' THEN
        INSERT INTO public.caja_movimientos (turno_id, tipo, monto, motivo)
        VALUES (v_solicitud.turno_id, v_solicitud.tipo, v_solicitud.monto, v_solicitud.motivo);
    END IF;

    RETURN p_solicitud_id;
END;
$$;

-- =============================================================
-- 9. RPC: generar_reset_token (invocado por admin)
-- =============================================================

CREATE OR REPLACE FUNCTION public.generar_reset_token(
    p_user_id UUID,
    p_caller_id UUID
)
RETURNS VARCHAR(6)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_token VARCHAR(6);
    v_tiene_permiso BOOLEAN;
BEGIN
    -- Validar que quien llama tiene permiso
    SELECT EXISTS (
        SELECT 1 FROM public.permisos_usuario
        WHERE usuario_id = p_caller_id AND permiso = 'gestionar_usuarios' AND habilitado = true
    ) OR EXISTS (
        SELECT 1 FROM public.perfiles WHERE id = p_caller_id AND rol_sistema = 'sistema_admin'
    ) INTO v_tiene_permiso;

    IF NOT v_tiene_permiso THEN
        RAISE EXCEPTION 'No tienes permiso para generar tokens de reseteo.';
    END IF;

    -- Generar código de 6 dígitos
    v_token := lpad(floor(random() * 1000000)::int::text, 6, '0');

    -- Insertar token (si ya hay uno no usado para este usuario, se reemplaza)
    INSERT INTO public.password_reset_tokens (user_id, code)
    VALUES (p_user_id, v_token);

    RETURN v_token;
END;
$$;

-- =============================================================
-- 10. VISTA: items con stock bajo
-- =============================================================

CREATE OR REPLACE VIEW public.vista_items_stock_bajo
WITH (security_invoker = true)
AS
SELECT
    i.id,
    i.nombre,
    i.sucursal_id,
    i.stock_actual,
    i.stock_minimo,
    i.tipo,
    s.nombre AS sucursal_nombre,
    e.nombre AS empresa_nombre
FROM public.items i
JOIN public.sucursales s ON s.id = i.sucursal_id
JOIN public.empresas e ON e.id = s.empresa_id
WHERE i.inventariable = true
  AND i.stock_actual <= i.stock_minimo
  AND i.stock_minimo > 0;

-- =============================================================
-- 11. RLS - password_reset_tokens
-- =============================================================

DROP POLICY IF EXISTS "sistema_admin bypass password_reset_tokens" ON public.password_reset_tokens;
CREATE POLICY "sistema_admin bypass password_reset_tokens" ON public.password_reset_tokens
    FOR ALL TO authenticated USING (public.es_sistema_admin());

-- El RPC genera_reset_token y la edge function manejan el acceso por código

-- =============================================================
-- 12. RLS - movimientos_caja_solicitudes
-- =============================================================

DROP POLICY IF EXISTS "sistema_admin bypass movimientos_caja_solicitudes" ON public.movimientos_caja_solicitudes;
CREATE POLICY "sistema_admin bypass movimientos_caja_solicitudes" ON public.movimientos_caja_solicitudes
    FOR ALL TO authenticated USING (public.es_sistema_admin());

DROP POLICY IF EXISTS "Ver solicitudes de mi sucursal" ON public.movimientos_caja_solicitudes;
CREATE POLICY "Ver solicitudes de mi sucursal" ON public.movimientos_caja_solicitudes
    FOR SELECT TO authenticated
    USING (
        turno_id IN (
            SELECT ct.id FROM public.caja_turnos ct
            WHERE ct.sucursal_id = (SELECT sucursal_id FROM public.perfiles WHERE id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Crear mis solicitudes" ON public.movimientos_caja_solicitudes;
CREATE POLICY "Crear mis solicitudes" ON public.movimientos_caja_solicitudes
    FOR INSERT TO authenticated
    WITH CHECK (usuario_id = auth.uid());

DROP POLICY IF EXISTS "Admin aprueba en su sucursal" ON public.movimientos_caja_solicitudes;
CREATE POLICY "Admin aprueba en su sucursal" ON public.movimientos_caja_solicitudes
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.perfiles p
            JOIN public.caja_turnos ct ON ct.sucursal_id = p.sucursal_id
            WHERE p.id = auth.uid() AND ct.id = turno_id AND p.rol = 'admin'
        )
        OR EXISTS (
            SELECT 1 FROM public.permisos_usuario pu
            JOIN public.caja_turnos ct ON ct.sucursal_id = (SELECT sucursal_id FROM public.perfiles WHERE id = auth.uid())
            WHERE pu.usuario_id = auth.uid() AND pu.permiso = 'aprobar_movimiento_caja' AND pu.habilitado = true AND ct.id = turno_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.perfiles p
            JOIN public.caja_turnos ct ON ct.sucursal_id = p.sucursal_id
            WHERE p.id = auth.uid() AND ct.id = turno_id AND p.rol = 'admin'
        )
        OR EXISTS (
            SELECT 1 FROM public.permisos_usuario pu
            JOIN public.caja_turnos ct ON ct.sucursal_id = (SELECT sucursal_id FROM public.perfiles WHERE id = auth.uid())
            WHERE pu.usuario_id = auth.uid() AND pu.permiso = 'aprobar_movimiento_caja' AND pu.habilitado = true AND ct.id = turno_id
        )
    );

-- =============================================================
-- 13. RLS - permisos_usuario
-- =============================================================

DROP POLICY IF EXISTS "sistema_admin bypass permisos_usuario" ON public.permisos_usuario;
CREATE POLICY "sistema_admin bypass permisos_usuario" ON public.permisos_usuario
    FOR ALL TO authenticated USING (public.es_sistema_admin());

-- Usuarios ven sus propios permisos (solo lectura)
DROP POLICY IF EXISTS "Ver mis propios permisos" ON public.permisos_usuario;
CREATE POLICY "Ver mis propios permisos" ON public.permisos_usuario
    FOR SELECT TO authenticated
    USING (usuario_id = auth.uid());

-- Admin ve y edita permisos de usuarios en su sucursal
DROP POLICY IF EXISTS "Admin gestiona permisos en sucursal" ON public.permisos_usuario;
CREATE POLICY "Admin gestiona permisos en sucursal" ON public.permisos_usuario
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.perfiles p_admin
            JOIN public.perfiles p_target ON p_target.sucursal_id = p_admin.sucursal_id
            WHERE p_admin.id = auth.uid() AND p_admin.rol = 'admin' AND p_target.id = usuario_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.perfiles p_admin
            JOIN public.perfiles p_target ON p_target.sucursal_id = p_admin.sucursal_id
            WHERE p_admin.id = auth.uid() AND p_admin.rol = 'admin' AND p_target.id = usuario_id
        )
    );

-- =============================================================
-- 14. RLS - vista_items_stock_bajo (hereda RLS vía security_invoker)
-- =============================================================

-- La vista usa security_invoker, por lo que aplican las policies de items.
-- Los items ya tienen filtro por sucursal. Sistema_admin bypass también aplica.

-- =============================================================
-- 15. POLICIES ADICIONALES PARA ANULACIÓN EN VENTAS
-- =============================================================

-- Policy para UPDATE de estado en ventas solo para admin o permiso anular_venta
DROP POLICY IF EXISTS "Anulación ventas por admin o permiso" ON public.ventas;
CREATE POLICY "Anulación ventas por admin o permiso" ON public.ventas
    FOR UPDATE TO authenticated
    USING (
        -- Puede actualizar si es admin de la sucursal
        (sucursal_id = (SELECT sucursal_id FROM public.perfiles WHERE id = auth.uid()) AND EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin'))
        OR
        -- O tiene el permiso anular_venta
        EXISTS (SELECT 1 FROM public.permisos_usuario WHERE usuario_id = auth.uid() AND permiso = 'anular_venta' AND habilitado = true)
        OR
        -- O es sistema_admin
        public.es_sistema_admin()
    )
    WITH CHECK (
        (sucursal_id = (SELECT sucursal_id FROM public.perfiles WHERE id = auth.uid()) AND EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin'))
        OR
        EXISTS (SELECT 1 FROM public.permisos_usuario WHERE usuario_id = auth.uid() AND permiso = 'anular_venta' AND habilitado = true)
        OR
        public.es_sistema_admin()
    );

-- =============================================================
-- 16. ÍNDICES ADICIONALES
-- =============================================================

CREATE INDEX IF NOT EXISTS idx_ventas_estado ON public.ventas(estado);
CREATE INDEX IF NOT EXISTS idx_items_inventariable ON public.items(sucursal_id, inventariable);
CREATE INDEX IF NOT EXISTS idx_permisos_usuario_usuario ON public.permisos_usuario(usuario_id);
