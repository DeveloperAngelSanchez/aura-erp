-- =============================================================
-- Migración 11: Auditoría de Ventas Registradas en POS Histórico
-- =============================================================

-- Asegurar políticas y compatibilidad de auditoría
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'caja_auditoria_log' AND policyname = 'Permitir insercion de auditoria a usuarios autenticados'
    ) THEN
        CREATE POLICY "Permitir insercion de auditoria a usuarios autenticados" ON public.caja_auditoria_log FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
END $$;
