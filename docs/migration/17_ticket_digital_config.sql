-- ============================================================================
-- Migración #17: Ticket Digital - Nuevas columnas en configuraciones
-- ============================================================================
-- Agrega campos para controlar la emisión del ticket digital en formato PDF
-- desde el módulo POS, alineado con la normativa SUNAT para representación
-- impresa de comprobantes de pago electrónico.
-- ============================================================================

-- 1. Agregar columnas de configuración del Ticket Digital
ALTER TABLE public.configuraciones
  ADD COLUMN IF NOT EXISTS ticket_digital_activo BOOLEAN DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS ticket_ancho VARCHAR(10) DEFAULT '80mm' NOT NULL,
  ADD COLUMN IF NOT EXISTS ticket_incluir_qr BOOLEAN DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS ticket_serie_prefijo VARCHAR(10) DEFAULT 'T001' NOT NULL;

-- Comentarios descriptivos
COMMENT ON COLUMN public.configuraciones.ticket_digital_activo IS 'Activa/desactiva la visualización del ticket digital PDF al finalizar ventas en POS';
COMMENT ON COLUMN public.configuraciones.ticket_ancho IS 'Ancho de impresión del ticket: 80mm (área imprimible ~72mm) o 58mm (área imprimible ~48mm)';
COMMENT ON COLUMN public.configuraciones.ticket_incluir_qr IS 'Incluir código QR de verificación SUNAT en el ticket';
COMMENT ON COLUMN public.configuraciones.ticket_serie_prefijo IS 'Prefijo de serie del comprobante tipo Ticket (ej: T001)';
