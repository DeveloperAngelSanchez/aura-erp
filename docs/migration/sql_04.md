# Migración 04 - Tablas de POS, Ventas y Movimientos de Caja

* **Fecha:** 2026-07-18
* **Descripción:** Creación de las tablas relacionales para el registro de ventas (cabecera y detalles), movimientos de efectivo en caja (ingresos por ventas y entradas/salidas manuales), habilitación de RLS por sucursal, y escritura de la función RPC transaccional para cobro POS atómico con decremento automático de stock directo y stock recursivo de kits/combos.
* **Fases del Plan Asociadas:** Paso 3.3: Control de Caja & Terminal de Venta (POS).

---

## Consultas SQL Ejecutadas

### 1. Estructuras DDL
```sql
-- Tabla de Movimientos de Caja
CREATE TABLE public.caja_movimientos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    turno_id UUID NOT NULL REFERENCES public.caja_turnos(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('ingreso_venta', 'ingreso_manual', 'egreso_manual')),
    monto DECIMAL(10,2) NOT NULL CHECK (monto > 0),
    motivo VARCHAR(255) NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla de Ventas
CREATE TABLE public.ventas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sucursal_id UUID NOT NULL REFERENCES public.sucursales(id) ON DELETE CASCADE,
    turno_id UUID NOT NULL REFERENCES public.caja_turnos(id) ON DELETE RESTRICT,
    usuario_id UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE RESTRICT,
    metodo_pago VARCHAR(20) NOT NULL CHECK (metodo_pago IN ('efectivo', 'tarjeta', 'transferencia')),
    total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla de Detalles de Venta
CREATE TABLE public.venta_detalles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venta_id UUID NOT NULL REFERENCES public.ventas(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE RESTRICT,
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_unitario DECIMAL(10,2) NOT NULL CHECK (precio_unitario >= 0)
);
```

### 2. Seguridad RLS
```sql
ALTER TABLE public.caja_movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venta_detalles ENABLE ROW LEVEL SECURITY;

-- Políticas de aislamiento
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

### 3. Procedimiento Almacenado de Venta POS (RPC `procesar_venta_pos`)
```sql
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
