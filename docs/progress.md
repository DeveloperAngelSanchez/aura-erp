# Reporte de Progreso del Desarrollo - Aura ERP/POS

Este documento registra el progreso actual del desarrollo en relación con el blueprint arquitectónico original definido en [plan.md](file:///Applications/XAMPP/xamppfiles/htdocs/app_erp_lite/plan.md).

---

## Resumen del Estado de las Fases

| Fase | Duración Estimada | Entregable / Hito | Estado Actual | Detalles de Implementación |
| :--- | :--- | :--- | :--- | :--- |
| **Fase 1: Infraestructura** | Semana 1 | Enlace activo integrado con base de datos. | **100% Completado** | Inicialización con Vite + React + TS + Tailwind. Conexión de API con Supabase e inicialización del cliente central. |
| **Fase 2: Autenticación** | Semana 2 | Login funcional con redirección por rol. | **100% Completado** | Supabase Auth, trigger de sincronización automática de perfiles, RLS por sucursal, contexto global de idioma (ES/EN con persistencia local) y adaptaciones de Safe Area en móviles. |
| **Fase 3: Caja y Compras** | Semana 3-4 | Flujo de efectivo diario y cuadre. | **100% Completado** | Tablas de proveedores, compras y movimientos. Trigger automático de incremento de stock en base de datos. CRUD de proveedores y formulario de ingreso de facturas. |
| **Fase 4: Catálogo y Kits** | Semana 5 | Inventario automatizado para combos/kits. | **100% Completado** | Tabla de items y kit_composicion. Vista SQL recursiva `vista_stock_kits`. Tabla administrativa de catálogo estilo Zenxius Light con badges, buscador y paginación. |
| **Fase 5: Módulo POS** | Semana 6-7 | Terminal POS 100% operativa. | **100% Completado** | Tablas de ventas y detalles de tickets. RPC transaccional atómico `procesar_venta_pos` con cálculo recursivo de inventario de combos. Interfaz táctil POS de grid de categorías y carrito. |
| **Fase 6: RRHH y Cierre** | Semana 8 | Dashboard interactivo y ciclo cerrado. | **100% Completado** | Tabla `asistencia` con RLS. Columna `comision_porcentaje` en perfiles. Vista `vista_comisiones_barberos` para cálculo de comisiones. Reloj de entrada/salida para barberos. Panel admin de personal con resumen de asistencias y comisiones. |

---

## Detalles Técnicos de la Implementación (Arquitectura Lograda)

1. **MVC Serverless Puro:**
   * **Modelo:** Reside en Supabase con restricciones relacionales estrictas y triggers nativos (ej. incremento de stock en compras).
   * **Controlador:** Operaciones complejas unificadas en transacciones a nivel de servidor (RPC `procesar_venta_pos`), y orquestación reactiva mediante custom hooks (`useAuth`, `useLanguage`, `useCash`).
   * **Vista:** Interfaz de usuario Zenxius Light Theme con un 100% de consistencia de colores Sellora (Slate, Cobalt Blue) y uso de iconos SVG vectoriales (`lucide-react`) sin emojis.
2. **Aislamiento Multi-Sucursal (RLS):**
   * Todas las tablas de negocio tienen habilitado Row Level Security y filtran dinámicamente según la sucursal del cajero conectado (`sucursal_id`), previniendo filtraciones de datos entre locales comerciales.
3. **Internacionalización y Persistencia:**
   * Contexto global de idioma que detecta la configuración regional del navegador y la almacena de forma persistente en `localStorage`, traduciendo toda la app instantáneamente en caliente.
4. **POS Responsive con Tabs Móviles:**
   * Refactor del monolito `POSTerminal.tsx` en componentes modulares (`CartPanel`, `CatalogPanel`).
   * En mobile (< lg): tabs intercambiables "Catálogo" | "Carrito" con cada panel ocupando el 100% del alto disponible.
   * En desktop (>= lg): layout side-by-side con la sidebar del carrito en altura completa (`h-full`).
5. **Reporte de Ventas e Ingresos:**
   * Vista SQL `vista_reporte_ventas` que cruza `ventas` + `perfiles` + `sucursales`.
   * Página `/admin/reports` con filtro de fechas (desde/hasta), 3 summary cards (hoy/semana/mes) con datos en tiempo real, y tabla de ventas recientes.
   * Dashboard de admin conectado a Supabase (cards de Ventas de Hoy, Turnos Activos, Total Barberos con datos reales).

---

## Detalles de Implementación — Fase 6 (RRHH y Cierre)

### Base de Datos (Supabase SQL)

1. **Tabla `public.asistencia`:**
   * Columnas: `id UUID PK`, `usuario_id FK → perfiles`, `sucursal_id FK → sucursales`, `fecha DATE`, `entrada_en TIMESTAMPTZ`, `salida_en TIMESTAMPTZ`.
   * Restricción `UNIQUE(usuario_id, fecha)` para un solo registro diario por barbero.
   * RLS habilitado con políticas de aislamiento por sucursal y auto-gestión del barbero (INSERT propio, UPDATE propia salida).

2. **Columna `comision_porcentaje` en `public.perfiles`:**
   * `DECIMAL(5,2) DEFAULT 0 CHECK (>= 0 AND <= 100)` — porcentaje de comisión del barbero sobre servicios.

3. **Vista `public.vista_comisiones_barberos`:**
   * Cruza `venta_detalles` (solo `tipo = 'servicio'`) con `ventas` y `perfiles` (solo `rol = 'barbero'`).
   * Calcula: `total_linea`, `comision = total_linea * comision_porcentaje / 100`.

### Frontend

| Archivo | Propósito |
| :--- | :--- |
| `src/features/hr/AttendancePanel.tsx` | Reloj de entrada/salida para barberos con confirmación de salida. Muestra comisiones acumuladas del día. |
| `src/features/hr/HRManager.tsx` | Panel admin en `/admin/hr`. Lista de barberos con estado de asistencia en vivo, comisiones (hoy/semana/mes), buscador y registro de asistencia del día. |
| `src/features/auth/RoleDashboards.tsx` | BarberDashboard actualizado para usar `AttendancePanel` con datos reales. AdminDashboard con 3 cards conectados a Supabase. |

### Mejoras al Módulo POS (Post-Fase 5)

| Archivo | Cambio |
| :--- | :--- |
| `src/features/pos/CartPanel.tsx` | **Creado** — componente extraído del monolito con carrito y checkout. |
| `src/features/pos/CatalogPanel.tsx` | **Creado** — componente extraído con grid de productos, buscador y filtros. |
| `src/features/pos/POSTerminal.tsx` | **Refactorizado** — usa componentes modulares, agrega tabs móviles, altura completa del detalle. |

### Reporte de Ventas

| Archivo | Cambio |
| :--- | :--- |
| DB: `vista_reporte_ventas` | Vista SQL que cruza `ventas` + `perfiles` + `sucursales`. |
| `src/features/reports/SalesReport.tsx` | Página con filtro de fechas, summary cards en tiempo real y tabla de ventas. |
| `src/routes/index.tsx` | Rutas `/admin/reports` y `/admin/hr` añadidas. |
| `src/components/Sidebar.tsx` | Items "Reportes / Ventas" y "Personal / Asistencia" con iconos `BarChart3` y `Users`. |

---

## Trabajo Futuro (Post v1.0.0)

1. **Persistencia del carrito en localStorage** — que el carrito del POS sobreviva a recargas y pérdidas de conexión (mencionado en `plan.md` sección 5).
2. **Selector de sucursal** — UI para cambiar de sucursal (actualmente definida por RLS del perfil).
3. **Modo offline** — colas de sincronización para operar sin internet.
4. **Gráficos en reportes** — añadir `recharts` para gráfico de barras (tendencia) y pastel (métodos de pago).
5. **Exportar reportes a CSV** — botón de descarga en SalesReport.
6. **Detalle de venta por barbero** — asignar `barbero_id` en `venta_detalles` para comisiones exactas.
