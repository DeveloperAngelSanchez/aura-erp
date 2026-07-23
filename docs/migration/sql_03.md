# Migración 03 - Tablas de Compras y Proveedores

* **Fecha:** 2026-07-18
* **Descripción:** Creación de las tablas relacionales para proveedores y gestión de facturas de compras para reabastecimiento de inventario físico, incorporando políticas de seguridad RLS por sucursal y trigger de incremento de stock automático.
* **Fases del Plan Asociadas:** Paso 3.2: Gestión de Inventario y Compras.

---

## Consultas SQL Ejecutadas

### 1. Creación de Estructuras DDL
```sql
-- Tabla de Proveedores
CREATE TABLE public.proveedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sucursal_id UUID NOT NULL REFERENCES public.sucursales(id) ON DELETE CASCADE,
    nombre VARCHAR(150) NOT NULL,
    contacto_nombre VARCHAR(100),
    telefono VARCHAR(30),
    direccion TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla de Compras
CREATE TABLE public.compras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sucursal_id UUID NOT NULL REFERENCES public.sucursales(id) ON DELETE CASCADE,
    proveedor_id UUID NOT NULL REFERENCES public.proveedores(id) ON DELETE RESTRICT,
    usuario_id UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE RESTRICT,
    total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla de Detalles de Compra
CREATE TABLE public.compra_detalles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    compra_id UUID NOT NULL REFERENCES public.compras(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE RESTRICT,
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_costo DECIMAL(10,2) NOT NULL CHECK (precio_costo >= 0)
);
```

### 2. Seguridad RLS
```sql
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compra_detalles ENABLE ROW LEVEL SECURITY;

-- Políticas de aislamiento
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
```

### 3. Automatización de Actualización de Stock (Trigger)
```sql
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
```
