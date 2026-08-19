-- =============================================================================
-- MIGRACIÓN 18: MEJORAS EMPRESARIALES CRM TIKTOK (Fase 1)
-- Aura ERP - Etiquetas, Respuestas Rápidas y Asignación de Agentes
-- =============================================================================

-- 1. Tabla de Etiquetas (Tags) configurables por empresa
CREATE TABLE IF NOT EXISTS public.crm_etiquetas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    nombre VARCHAR(50) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#2563EB',
    orden INT DEFAULT 0,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_etiqueta_empresa UNIQUE (empresa_id, nombre)
);

-- 2. Tabla de relación Muchos-a-Muchos para Vincular Etiquetas a Conversaciones
CREATE TABLE IF NOT EXISTS public.crm_conversacion_etiquetas (
    conversacion_id UUID NOT NULL REFERENCES public.crm_conversaciones(id) ON DELETE CASCADE,
    etiqueta_id UUID NOT NULL REFERENCES public.crm_etiquetas(id) ON DELETE CASCADE,
    PRIMARY KEY (conversacion_id, etiqueta_id)
);

-- 3. Tabla de Respuestas Rápidas configurables por empresa
CREATE TABLE IF NOT EXISTS public.crm_respuestas_rapidas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    titulo VARCHAR(100) NOT NULL,
    contenido TEXT NOT NULL,
    categoria VARCHAR(50) DEFAULT 'general',
    atajo VARCHAR(20),
    orden INT DEFAULT 0,
    activo BOOLEAN NOT NULL DEFAULT true,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Añadir Prioridad a Conversaciones si no existe
ALTER TABLE public.crm_conversaciones ADD COLUMN IF NOT EXISTS prioridad VARCHAR(10) DEFAULT 'normal' CHECK (prioridad IN ('urgente', 'alta', 'normal', 'baja'));

-- Habilitar RLS en las nuevas tablas
ALTER TABLE public.crm_etiquetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_conversacion_etiquetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_respuestas_rapidas ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para crm_etiquetas
DROP POLICY IF EXISTS "Aislamiento multiempresa crm_etiquetas" ON public.crm_etiquetas;
CREATE POLICY "Aislamiento multiempresa crm_etiquetas"
ON public.crm_etiquetas FOR ALL TO authenticated
USING (
    empresa_id IN (
        SELECT s.empresa_id 
        FROM public.perfiles p
        JOIN public.sucursales s ON s.id = p.sucursal_id
        WHERE p.id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol_sistema = 'sistema_admin'
    )
)
WITH CHECK (
    empresa_id IN (
        SELECT s.empresa_id 
        FROM public.perfiles p
        JOIN public.sucursales s ON s.id = p.sucursal_id
        WHERE p.id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol_sistema = 'sistema_admin'
    )
);

-- Políticas de RLS para crm_conversacion_etiquetas
DROP POLICY IF EXISTS "Aislamiento multiempresa crm_conversacion_etiquetas" ON public.crm_conversacion_etiquetas;
CREATE POLICY "Aislamiento multiempresa crm_conversacion_etiquetas"
ON public.crm_conversacion_etiquetas FOR ALL TO authenticated
USING (
    conversacion_id IN (
        SELECT c.id FROM public.crm_conversaciones c
        JOIN public.sucursales s ON s.empresa_id = c.empresa_id
        JOIN public.perfiles p ON p.sucursal_id = s.id
        WHERE p.id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol_sistema = 'sistema_admin'
    )
)
WITH CHECK (
    conversacion_id IN (
        SELECT c.id FROM public.crm_conversaciones c
        JOIN public.sucursales s ON s.empresa_id = c.empresa_id
        JOIN public.perfiles p ON p.sucursal_id = s.id
        WHERE p.id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol_sistema = 'sistema_admin'
    )
);

-- Políticas de RLS para crm_respuestas_rapidas
DROP POLICY IF EXISTS "Aislamiento multiempresa crm_respuestas_rapidas" ON public.crm_respuestas_rapidas;
CREATE POLICY "Aislamiento multiempresa crm_respuestas_rapidas"
ON public.crm_respuestas_rapidas FOR ALL TO authenticated
USING (
    empresa_id IN (
        SELECT s.empresa_id 
        FROM public.perfiles p
        JOIN public.sucursales s ON s.id = p.sucursal_id
        WHERE p.id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol_sistema = 'sistema_admin'
    )
)
WITH CHECK (
    empresa_id IN (
        SELECT s.empresa_id 
        FROM public.perfiles p
        JOIN public.sucursales s ON s.id = p.sucursal_id
        WHERE p.id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol_sistema = 'sistema_admin'
    )
);

-- Habilitar Supabase Realtime para recibir etiquetas y cambios de prioridad
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_etiquetas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_conversacion_etiquetas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_respuestas_rapidas;
