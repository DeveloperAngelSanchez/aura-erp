# Esquema de Base de Datos - Completo (Schema)

Este archivo contiene el diseño y la definición DDL completa del esquema actual de la base de datos PostgreSQL en Supabase.

---

## 1. Definición de Tablas

```sql
-- 1. Tabla de Sucursales (Aislamiento de locales)
CREATE TABLE public.sucursales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    direccion VARCHAR(200),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabla de Perfiles (Extensión de auth.users en esquema public)
CREATE TABLE public.perfiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    sucursal_id UUID REFERENCES public.sucursales(id) ON DELETE SET NULL,
    nombre VARCHAR(100) NOT NULL,
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('admin', 'cajero', 'barbero')),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabla de Items (Unificación de productos, servicios y combos/kits)
CREATE TABLE public.items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sucursal_id UUID NOT NULL REFERENCES public.sucursales(id) ON DELETE CASCADE,
    nombre VARCHAR(150) NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('producto', 'servicio', 'kit')),
    precio_venta DECIMAL(10, 2) NOT NULL CHECK (precio_venta >= 0),
    stock_actual INT DEFAULT 0 CHECK (stock_actual >= 0),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabla de Composición de Kits (Relación recursiva muchos-a-muchos)
CREATE TABLE public.kit_composicion (
    kit_padre_id UUID REFERENCES public.items(id) ON DELETE CASCADE,
    componente_hijo_id UUID REFERENCES public.items(id) ON DELETE RESTRICT,
    cantidad_requerida INT NOT NULL CHECK (cantidad_requerida > 0),
    PRIMARY KEY (kit_padre_id, componente_hijo_id),
    CONSTRAINT chk_no_bucle CHECK (kit_padre_id <> componente_hijo_id)
);

-- 5. Tabla de Proveedores
CREATE TABLE public.proveedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sucursal_id UUID NOT NULL REFERENCES public.sucursales(id) ON DELETE CASCADE,
    nombre VARCHAR(150) NOT NULL,
    contacto_nombre VARCHAR(100),
    telefono VARCHAR(30),
    direccion TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Tabla de Compras
CREATE TABLE public.compras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sucursal_id UUID NOT NULL REFERENCES public.sucursales(id) ON DELETE CASCADE,
    proveedor_id UUID NOT NULL REFERENCES public.proveedores(id) ON DELETE RESTRICT,
    usuario_id UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE RESTRICT,
    total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Tabla de Detalles de Compra
CREATE TABLE public.compra_detalles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    compra_id UUID NOT NULL REFERENCES public.compras(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE RESTRICT,
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_costo DECIMAL(10,2) NOT NULL CHECK (precio_costo >= 0)
);

-- 8. Tabla de Caja Turnos (Control diario de flujos de efectivo)
CREATE TABLE public.caja_turnos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sucursal_id UUID NOT NULL REFERENCES public.sucursales(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE RESTRICT,
    monto_apertura DECIMAL(10,2) NOT NULL CHECK (monto_apertura >= 0),
    monto_cierre_real DECIMAL(10,2) CHECK (monto_cierre_real >= 0),
    estado VARCHAR(10) NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto', 'cerrado')),
    abierto_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    cerrado_en TIMESTAMP WITH TIME ZONE
);

-- 9. Tabla de Movimientos de Caja
CREATE TABLE public.caja_movimientos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    turno_id UUID NOT NULL REFERENCES public.caja_turnos(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('ingreso_venta', 'ingreso_manual', 'egreso_manual')),
    monto DECIMAL(10,2) NOT NULL CHECK (monto > 0),
    motivo VARCHAR(255) NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Tabla de Ventas (Facturas)
CREATE TABLE public.ventas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sucursal_id UUID NOT NULL REFERENCES public.sucursales(id) ON DELETE CASCADE,
    turno_id UUID NOT NULL REFERENCES public.caja_turnos(id) ON DELETE RESTRICT,
    usuario_id UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE RESTRICT,
    metodo_pago VARCHAR(20) NOT NULL CHECK (metodo_pago IN ('efectivo', 'tarjeta', 'transferencia')),
    total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. Tabla de Detalles de Venta
CREATE TABLE public.venta_detalles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venta_id UUID NOT NULL REFERENCES public.ventas(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE RESTRICT,
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_unitario DECIMAL(10,2) NOT NULL CHECK (precio_unitario >= 0)
);
```

---

## 2. Automatizaciones y Triggers

```sql
-- Función para crear automáticamente un perfil de usuario público tras el registro en Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.perfiles (id, nombre, rol, sucursal_id)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'nombre', 'Usuario Nuevo'),
    COALESCE(new.raw_user_meta_data->>'rol', 'cajero'),
    (SELECT id FROM public.sucursales LIMIT 1) -- Se asocia a la primera sucursal por defecto
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger asociado
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Vista recursiva para el cálculo dinámico del stock disponible de un kit
CREATE OR REPLACE VIEW vista_stock_kits AS
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


-- Función y Trigger para reabastecimiento de stock en compras
CREATE OR REPLACE FUNCTION public.actualizar_stock_por_compra()
RETURNS trigger AS $$
BEGIN
  IF (SELECT tipo FROM public.items WHERE id = NEW.item_id) = 'producto' THEN
    UPDATE public.items 
    SET stock_actual = stock_actual + NEW.cantidad 
    WHERE id = NEW.item_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_actualizar_stock_por_compra
  AFTER INSERT ON public.compra_detalles
  FOR EACH ROW EXECUTE FUNCTION public.actualizar_stock_por_compra();

-- Procedimiento Almacenado RPC para procesar ventas de forma atómica y decrementar stock (directo y de kits)
CREATE OR REPLACE FUNCTION public.procesar_venta_pos(
  p_sucursal_id UUID,
  p_turno_id UUID,
  p_usuario_id UUID,
  p_metodo_pago VARCHAR,
  p_total DECIMAL,
  p_items JSONB
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

  -- 2. Insertar cabecera de la venta
  INSERT INTO public.ventas (sucursal_id, turno_id, usuario_id, metodo_pago, total)
  VALUES (p_sucursal_id, p_turno_id, p_usuario_id, p_metodo_pago, p_total)
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
$$ LANGUAGE plpgsql;
```

---

## 3. Seguridad de Filas (Row Level Security - RLS)

```sql
-- Habilitar RLS en todas las tablas
ALTER TABLE public.sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caja_turnos ENABLE ROW LEVEL SECURITY;

-- Políticas de Sucursales
CREATE POLICY "Allow public read access to sucursales" ON public.sucursales 
  FOR SELECT USING (true);

-- Políticas de Perfiles
CREATE POLICY "Permitir lectura de perfiles a usuarios autenticados" ON public.perfiles 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir actualizaciones a su propio perfil" ON public.perfiles 
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Políticas de Items
CREATE POLICY "Acceso a items filtrado por sucursal" ON public.items 
  FOR ALL TO authenticated USING (
    sucursal_id = (SELECT sucursal_id FROM public.perfiles WHERE id = auth.uid())
  );

-- Políticas de Caja Turnos
CREATE POLICY "Acceso a turnos de caja filtrado por sucursal" ON public.caja_turnos 
  FOR ALL TO authenticated USING (
    sucursal_id = (SELECT sucursal_id FROM public.perfiles WHERE id = auth.uid())
  );

-- Habilitar RLS en Compras e Inventario
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compra_detalles ENABLE ROW LEVEL SECURITY;

-- Políticas de Compras e Inventario
CREATE POLICY "Aislamiento Sucursal Proveedores" ON public.proveedores
  FOR ALL TO authenticated USING (
    sucursal_id = (SELECT sucursal_id FROM public.perfiles WHERE id = auth.uid())
  );

CREATE POLICY "Aislamiento Sucursal Compras" ON public.compras
  FOR ALL TO authenticated USING (
    sucursal_id = (SELECT sucursal_id FROM public.perfiles WHERE id = auth.uid())
  );

CREATE POLICY "Aislamiento Sucursal Detalles Compra" ON public.compra_detalles
  FOR ALL TO authenticated USING (
    (SELECT sucursal_id FROM public.compras WHERE id = compra_id) = 
    (SELECT sucursal_id FROM public.perfiles WHERE id = auth.uid())
  );

-- Habilitar RLS en POS y Caja
ALTER TABLE public.caja_movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venta_detalles ENABLE ROW LEVEL SECURITY;

-- Políticas de POS y Caja
CREATE POLICY "Aislamiento Sucursal Movimientos Caja" ON public.caja_movimientos
  FOR ALL TO authenticated USING (
    (SELECT sucursal_id FROM public.caja_turnos WHERE id = turno_id) = 
    (SELECT sucursal_id FROM public.perfiles WHERE id = auth.uid())
  );

CREATE POLICY "Aislamiento Sucursal Ventas" ON public.ventas
  FOR ALL TO authenticated USING (
    sucursal_id = (SELECT sucursal_id FROM public.perfiles WHERE id = auth.uid())
  );

CREATE POLICY "Aislamiento Sucursal Detalles Venta" ON public.venta_detalles
  FOR ALL TO authenticated USING (
    (SELECT sucursal_id FROM public.ventas WHERE id = venta_id) = 
    (SELECT sucursal_id FROM public.perfiles WHERE id = auth.uid())
  );
```
