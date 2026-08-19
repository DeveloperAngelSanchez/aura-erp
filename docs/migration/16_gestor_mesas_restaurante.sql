-- =============================================================
-- Migración 16: Gestor de Mesas Persistentes (Restaurantes)
-- =============================================================

-- 1. Tabla de mesas
CREATE TABLE IF NOT EXISTS public.mesas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id UUID NOT NULL REFERENCES public.sucursales(id) ON DELETE CASCADE,
  nombre VARCHAR(60) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'disponible' CHECK (estado IN ('disponible', 'ocupada', 'pendiente')),
  abierta_en TIMESTAMPTZ,
  turno_id UUID REFERENCES public.caja_turnos(id),
  mesero_id UUID REFERENCES public.perfiles(id),
  cliente_nombre VARCHAR(200),
  cliente_id UUID REFERENCES public.clientes(id),
  cart_data JSONB DEFAULT '[]'::jsonb,
  orden_visual INT NOT NULL DEFAULT 0,
  activa BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.mesas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acceso mesas autenticados" ON public.mesas;
CREATE POLICY "Acceso mesas autenticados" ON public.mesas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_mesas_sucursal ON public.mesas(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_mesas_estado ON public.mesas(sucursal_id, estado);

-- 2. Columnas en configuraciones
ALTER TABLE public.configuraciones
  ADD COLUMN IF NOT EXISTS mesas_cantidad INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mesas_prefijo VARCHAR(10) NOT NULL DEFAULT 'MS';

-- 3. Función RPC sincronizar_mesas
CREATE OR REPLACE FUNCTION public.sincronizar_mesas(
  p_sucursal_id UUID,
  p_cantidad INT,
  p_prefijo VARCHAR
) RETURNS VOID AS $$
DECLARE
  i INT;
  mesa_nombre VARCHAR;
BEGIN
  -- Desactivar mesas con orden_visual > p_cantidad
  UPDATE public.mesas
  SET activa = false
  WHERE sucursal_id = p_sucursal_id AND orden_visual > p_cantidad;

  -- Reactivar y renombrar mesas existentes con orden_visual <= p_cantidad
  UPDATE public.mesas
  SET activa = true,
      nombre = p_prefijo || '-' || LPAD(orden_visual::TEXT, 2, '0')
  WHERE sucursal_id = p_sucursal_id AND orden_visual <= p_cantidad;

  -- Crear mesas faltantes
  FOR i IN 1..p_cantidad LOOP
    mesa_nombre := p_prefijo || '-' || LPAD(i::TEXT, 2, '0');
    INSERT INTO public.mesas (sucursal_id, nombre, orden_visual)
    SELECT p_sucursal_id, mesa_nombre, i
    WHERE NOT EXISTS (
      SELECT 1 FROM public.mesas
      WHERE sucursal_id = p_sucursal_id AND orden_visual = i
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
