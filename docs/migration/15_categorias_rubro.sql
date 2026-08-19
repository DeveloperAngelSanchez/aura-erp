-- =============================================================================
-- MIGRACIÓN 15: ASIGNACIÓN DE RUBRO A CATEGORÍAS
-- Aura ERP - Filtrado de categorías por Rubro de Empresa
-- =============================================================================

-- 1. Agregar columna rubro a public.categorias
ALTER TABLE public.categorias
ADD COLUMN IF NOT EXISTS rubro VARCHAR(30) NOT NULL DEFAULT 'general' CHECK (rubro IN ('barberia', 'restaurante', 'general'));

-- Index para búsquedas ultra-rápidas por rubro y sucursal
CREATE INDEX IF NOT EXISTS idx_categorias_rubro ON public.categorias(rubro);

-- 2. Clasificar categorías existentes según su rubro
UPDATE public.categorias
SET rubro = 'restaurante'
WHERE nombre IN ('Bebidas y Refrescos', 'Platos de Fondo / Cocina', 'Parrillas y Carnes');

UPDATE public.categorias
SET rubro = 'barberia'
WHERE nombre IN ('Cortes y Barbería');

-- 3. Insertar categorías adicionales por defecto si no existen
INSERT INTO public.categorias (nombre, estacion_impresion, icono, rubro)
SELECT 'Postres y Pastelería', 'pasteleria', 'cake', 'restaurante'
WHERE NOT EXISTS (SELECT 1 FROM public.categorias WHERE nombre = 'Postres y Pastelería');

INSERT INTO public.categorias (nombre, estacion_impresion, icono, rubro)
SELECT 'Productos Generales', 'caja', 'package', 'general'
WHERE NOT EXISTS (SELECT 1 FROM public.categorias WHERE nombre = 'Productos Generales');
