# Migración 01 - Inicialización del Esquema, Automatizaciones y Políticas RLS

* **Fecha:** 2026-07-18
* **Descripción:** Creación del esquema relacional base para multi-sucursal, triggers de sincronización de perfiles y configuración inicial de seguridad de filas (RLS).
* **Fases del Plan Asociadas:** Fase 1 (Infraestructura) y Fase 2 (Autenticación).

---

## Consultas SQL Ejecutadas

### 1. Definición de Estructura Base e Inserciones Iniciales
```sql
-- Creación de tabla de sucursales
CREATE TABLE public.sucursales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    direccion VARCHAR(200),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Registrar sucursal inicial por defecto
INSERT INTO public.sucursales (nombre, direccion) 
VALUES ('Sucursal Central', 'Calle Principal #123');

-- Creación de perfiles vinculada a la autenticación de Supabase (auth.users)
CREATE TABLE public.perfiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    sucursal_id UUID REFERENCES public.sucursales(id) ON DELETE SET NULL,
    nombre VARCHAR(100) NOT NULL,
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('admin', 'cajero', 'barbero')),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Creación de catálogo unificado de ítems (productos, servicios y kits)
CREATE TABLE public.items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sucursal_id UUID NOT NULL REFERENCES public.sucursales(id) ON DELETE CASCADE,
    nombre VARCHAR(150) NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('producto', 'servicio', 'kit')),
    precio_venta DECIMAL(10, 2) NOT NULL CHECK (precio_venta >= 0),
    stock_actual INT DEFAULT 0 CHECK (stock_actual >= 0),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Creación de composición recursiva de kits
CREATE TABLE public.kit_composicion (
    kit_padre_id UUID REFERENCES public.items(id) ON DELETE CASCADE,
    componente_hijo_id UUID REFERENCES public.items(id) ON DELETE RESTRICT,
    cantidad_requerida INT NOT NULL CHECK (cantidad_requerida > 0),
    PRIMARY KEY (kit_padre_id, componente_hijo_id),
    CONSTRAINT chk_no_bucle CHECK (kit_padre_id <> componente_hijo_id)
);

-- Creación de turnos de caja para auditoría de flujos
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
```

### 2. Sincronización Automática de Cuentas (Auth Trigger)
```sql
-- Función ejecutada en la creación de usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.perfiles (id, nombre, rol, sucursal_id)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'nombre', 'Usuario Nuevo'),
    COALESCE(new.raw_user_meta_data->>'rol', 'cajero'),
    (SELECT id FROM public.sucursales LIMIT 1)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger disparador
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 3. Habilitación de Seguridad y Declaración de Políticas RLS
```sql
-- Habilitación
ALTER TABLE public.sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caja_turnos ENABLE ROW LEVEL SECURITY;

-- Política: Lectura de sucursales abierta a usuarios
CREATE POLICY "Allow public read access to sucursales" ON public.sucursales 
  FOR SELECT USING (true);

-- Políticas: Perfiles legibles por autenticados, editables por el propio usuario
CREATE POLICY "Permitir lectura de perfiles a usuarios autenticados" ON public.perfiles 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir actualizaciones a su propio perfil" ON public.perfiles 
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Políticas: Catálogo e Historial de caja filtrados estrictamente por sucursal del empleado
CREATE POLICY "Acceso a items filtrado por sucursal" ON public.items 
  FOR ALL TO authenticated USING (
    sucursal_id = (SELECT sucursal_id FROM public.perfiles WHERE id = auth.uid())
  );

CREATE POLICY "Acceso a turnos de caja filtrado por sucursal" ON public.caja_turnos 
  FOR ALL TO authenticated USING (
    sucursal_id = (SELECT sucursal_id FROM public.perfiles WHERE id = auth.uid())
  );
```
