-- =============================================================
-- Migración 13: Desnichado Multi-Rubro (Barberías & Restaurantes)
-- =============================================================

-- 1. Agregar columna 'rubro' en public.empresas con 'barberia' por defecto
ALTER TABLE public.empresas 
ADD COLUMN IF NOT EXISTS rubro VARCHAR(30) NOT NULL DEFAULT 'barberia';

-- 2. Asegurar que las empresas existentes tengan 'barberia' y aplicar CHECK constraint
UPDATE public.empresas 
SET rubro = 'barberia' 
WHERE rubro IS NULL OR rubro = '';

ALTER TABLE public.empresas
DROP CONSTRAINT IF EXISTS empresas_rubro_check;

ALTER TABLE public.empresas
ADD CONSTRAINT empresas_rubro_check 
CHECK (rubro IN ('barberia', 'restaurante', 'general'));

-- 3. Actualizar CHECK constraint en public.perfiles para incluir nuevos roles de Restaurante
-- Roles disponibles:
--   Universal: 'admin', 'cajero'
--   Barbería:  'barbero'
--   Restaurante: 'mesero', 'jefe', 'asistente'
ALTER TABLE public.perfiles 
DROP CONSTRAINT IF EXISTS perfiles_rol_check;

ALTER TABLE public.perfiles 
ADD CONSTRAINT perfiles_rol_check 
CHECK (rol IN ('admin', 'cajero', 'barbero', 'mesero', 'jefe', 'asistente'));

-- 4. Crear vista auxiliar para consultar perfiles con el rubro de su empresa
CREATE OR REPLACE VIEW public.vista_perfiles_empresa
WITH (security_invoker = true)
AS
SELECT 
    p.id,
    p.nombre,
    p.email,
    p.rol,
    p.rol_sistema,
    p.activo,
    p.comision_porcentaje,
    p.sucursal_id,
    s.nombre AS sucursal_nombre,
    s.empresa_id,
    e.nombre AS empresa_nombre,
    COALESCE(e.rubro, 'barberia') AS empresa_rubro
FROM public.perfiles p
LEFT JOIN public.sucursales s ON s.id = p.sucursal_id
LEFT JOIN public.empresas e ON e.id = s.empresa_id;
