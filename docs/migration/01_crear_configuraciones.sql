-- 1. Crear Tabla de Configuraciones
CREATE TABLE IF NOT EXISTS public.configuraciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sucursal_id UUID REFERENCES public.sucursales(id) ON DELETE CASCADE UNIQUE NOT NULL,
    moneda_simbolo VARCHAR(5) DEFAULT '$' NOT NULL,
    moneda_decimales INT DEFAULT 2 NOT NULL CHECK (moneda_decimales IN (0, 2)),
    impuesto_porcentaje DECIMAL(5,2) DEFAULT 0.00 NOT NULL CHECK (impuesto_porcentaje >= 0 AND impuesto_porcentaje <= 100),
    ticket_encabezado TEXT DEFAULT '' NOT NULL,
    ticket_pie TEXT DEFAULT '' NOT NULL,
    limite_efectivo_caja DECIMAL(10,2) DEFAULT 500.00 NOT NULL CHECK (limite_efectivo_caja >= 0),
    comision_base_servicio DECIMAL(5,2) DEFAULT 0.00 NOT NULL CHECK (comision_base_servicio >= 0 AND comision_base_servicio <= 100),
    metodos_pago_permitidos TEXT[] DEFAULT ARRAY['efectivo', 'tarjeta', 'transferencia']::TEXT[] NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Habilitar Row Level Security (RLS)
ALTER TABLE public.configuraciones ENABLE ROW LEVEL SECURITY;

-- 3. Crear Políticas de Seguridad
-- Lectura: Cualquier usuario autenticado dentro de la misma sucursal
CREATE POLICY "Lectura de configuraciones por sucursal" ON public.configuraciones
    FOR SELECT
    TO authenticated
    USING (
        sucursal_id = (SELECT sucursal_id FROM public.perfiles WHERE id = auth.uid())
    );

-- Escritura/Modificación: Solo administradores de la misma sucursal
CREATE POLICY "Modificación de configuraciones por administradores" ON public.configuraciones
    FOR ALL
    TO authenticated
    USING (
        sucursal_id = (SELECT sucursal_id FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin')
    )
    WITH CHECK (
        sucursal_id = (SELECT sucursal_id FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin')
    );

-- 4. Función y Trigger para Inicialización Automática
CREATE OR REPLACE FUNCTION public.inicializar_configuracion_sucursal()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.configuraciones (sucursal_id)
    VALUES (NEW.id)
    ON CONFLICT (sucursal_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_inicializar_configuracion_sucursal
    AFTER INSERT ON public.sucursales
    FOR EACH ROW EXECUTE FUNCTION public.inicializar_configuracion_sucursal();

-- 5. Inicializar datos para sucursales preexistentes
INSERT INTO public.configuraciones (sucursal_id)
SELECT id FROM public.sucursales
ON CONFLICT (sucursal_id) DO NOTHING;
