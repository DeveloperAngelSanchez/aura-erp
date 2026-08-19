-- =============================================================================
-- MIGRACIÓN 17: MÓDULO CRM TIKTOK Y MENSAJERÍA (SaaS Multiempresa Blindado)
-- Aura ERP - Estructura de tablas, RLS Multi-Tenant y suscripción Realtime
-- =============================================================================

-- 1. Tabla de Configuración de API de TikTok por Empresa / Sucursal
CREATE TABLE IF NOT EXISTS public.crm_config_tiktok (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    tiktok_app_id VARCHAR(100),
    tiktok_app_secret VARCHAR(255),
    access_token TEXT,
    refresh_token TEXT,
    webhook_verify_token VARCHAR(100) DEFAULT gen_random_uuid()::text,
    modo_sandbox BOOLEAN NOT NULL DEFAULT true,
    activo BOOLEAN NOT NULL DEFAULT true,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_crm_config_empresa UNIQUE (empresa_id)
);

-- 2. Tabla de Conversaciones / Hilos del CRM
CREATE TABLE IF NOT EXISTS public.crm_conversaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    tiktok_user_id VARCHAR(100) NOT NULL,
    nombre_contacto VARCHAR(150) NOT NULL,
    username_contacto VARCHAR(100),
    avatar_url TEXT,
    telefono VARCHAR(30),
    email VARCHAR(100),
    estado VARCHAR(30) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_proceso', 'cerrado')),
    no_leidos INT NOT NULL DEFAULT 0,
    ultimo_mensaje TEXT,
    ultimo_mensaje_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    asignado_a UUID REFERENCES public.perfiles(id) ON DELETE SET NULL,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    notas_internas TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_crm_conv_empresa_tiktok_user UNIQUE (empresa_id, tiktok_user_id)
);

-- 3. Tabla de Mensajes del Chat CRM
CREATE TABLE IF NOT EXISTS public.crm_mensajes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversacion_id UUID NOT NULL REFERENCES public.crm_conversaciones(id) ON DELETE CASCADE,
    direccion VARCHAR(10) NOT NULL CHECK (direccion IN ('inbound', 'outbound')),
    contenido TEXT NOT NULL,
    tiktok_message_id VARCHAR(100),
    leido BOOLEAN NOT NULL DEFAULT false,
    enviado_por UUID REFERENCES public.perfiles(id) ON DELETE SET NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Índices de alto rendimiento para filtros multiempresa
CREATE INDEX IF NOT EXISTS idx_crm_config_empresa ON public.crm_config_tiktok (empresa_id);
CREATE INDEX IF NOT EXISTS idx_crm_conv_empresa_estado ON public.crm_conversaciones (empresa_id, estado);
CREATE INDEX IF NOT EXISTS idx_crm_conv_ultimo_msg ON public.crm_conversaciones (empresa_id, ultimo_mensaje_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_mensajes_conv ON public.crm_mensajes (conversacion_id, creado_en ASC);

-- Habilitar RLS en todas las tablas del CRM para aislamiento estricto de SaaS
ALTER TABLE public.crm_config_tiktok ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_conversaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_mensajes ENABLE ROW LEVEL SECURITY;

-- Funciones / Políticas RLS Multi-Tenant (Garantizan aislamiento absoluto entre empresas)
DROP POLICY IF EXISTS "Aislamiento multiempresa crm_config_tiktok" ON public.crm_config_tiktok;
CREATE POLICY "Aislamiento multiempresa crm_config_tiktok"
ON public.crm_config_tiktok FOR ALL TO authenticated
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

DROP POLICY IF EXISTS "Aislamiento multiempresa crm_conversaciones" ON public.crm_conversaciones;
CREATE POLICY "Aislamiento multiempresa crm_conversaciones"
ON public.crm_conversaciones FOR ALL TO authenticated
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

DROP POLICY IF EXISTS "Aislamiento multiempresa crm_mensajes" ON public.crm_mensajes;
CREATE POLICY "Aislamiento multiempresa crm_mensajes"
ON public.crm_mensajes FOR ALL TO authenticated
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

-- Habilitar Supabase Realtime para recibir mensajes en tiempo real en la UI
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_conversaciones;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_mensajes;
