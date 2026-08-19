-- =============================================================================
-- MIGRACIÓN 14: CATEGORÍAS, SECTORIZACIÓN DE COMANDAS Y TRIBUTACIÓN SUNAT
-- Aura ERP - Preparación de arquitectura escalable para Restaurantes y SUNAT
-- =============================================================================

-- 1. Crear tabla de categorías con soporte para estación de impresión (Comandas)
CREATE TABLE IF NOT EXISTS public.categorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sucursal_id UUID REFERENCES public.sucursales(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    estacion_impresion VARCHAR(50) NOT NULL DEFAULT 'cocina' CHECK (estacion_impresion IN ('cocina', 'bar', 'parrilla', 'pasteleria', 'caja')),
    icono VARCHAR(50) DEFAULT 'package',
    activa BOOLEAN NOT NULL DEFAULT true,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Habilitar RLS en categorías
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir todo a usuarios autenticados en categorias"
ON public.categorias FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 2. Agregar campos en public.items para categorías, sectorización y tributación SUNAT
ALTER TABLE public.items
ADD COLUMN IF NOT EXISTS categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS codigo_sunat VARCHAR(20) DEFAULT '50192701',
ADD COLUMN IF NOT EXISTS unidad_medida VARCHAR(10) DEFAULT 'NIU',
ADD COLUMN IF NOT EXISTS tipo_afectacion_igv VARCHAR(10) DEFAULT '10';

-- Index para acelerar filtros de categoría en POS y reportes
CREATE INDEX IF NOT EXISTS idx_items_categoria_id ON public.items(categoria_id);
CREATE INDEX IF NOT EXISTS idx_categorias_sucursal_id ON public.categorias(sucursal_id);

-- 3. Categorías por defecto iniciales (Barbería y Restaurantes)
INSERT INTO public.categorias (nombre, estacion_impresion, icono)
SELECT 'Bebidas y Refrescos', 'bar', 'glass-water'
WHERE NOT EXISTS (SELECT 1 FROM public.categorias WHERE nombre = 'Bebidas y Refrescos');

INSERT INTO public.categorias (nombre, estacion_impresion, icono)
SELECT 'Platos de Fondo / Cocina', 'cocina', 'utensils'
WHERE NOT EXISTS (SELECT 1 FROM public.categorias WHERE nombre = 'Platos de Fondo / Cocina');

INSERT INTO public.categorias (nombre, estacion_impresion, icono)
SELECT 'Parrillas y Carnes', 'parrilla', 'flame'
WHERE NOT EXISTS (SELECT 1 FROM public.categorias WHERE nombre = 'Parrillas y Carnes');

INSERT INTO public.categorias (nombre, estacion_impresion, icono)
SELECT 'Cortes y Barbería', 'caja', 'scissors'
WHERE NOT EXISTS (SELECT 1 FROM public.categorias WHERE nombre = 'Cortes y Barbería');
