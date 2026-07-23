# Blueprint Arquitectónico y Plan de Desarrollo
**Sistema ERP/POS Serverless Escalable para Gestión de Barberías y Multi-Sucursales**

**Control de Documento:**
* **Stack Target:** React, Supabase (PostgreSQL), Vercel
* **Infraestructura:** Serverless (Capa Gratuita 100%)
* **Patrón:** BaaS + MVC Descentralizado
* **Versión:** 1.0.0 (Fase de Inicialización)

---

## 1. Arquitectura del Sistema e Integración de Capas

Para cumplir con la premisa de costo cero de por vida en fases iniciales y asegurar la capacidad de escalar a grandes cadenas corporativas, el diseño desacopla el almacenamiento transaccional y las reglas de negocio críticas delegándolos a la nube a través de un enfoque Backend-as-a-Service (BaaS), usando **Supabase** (PostgreSQL nativo), mientras que la interfaz reactiva y optimizada para el punto de venta (POS) es administrada por **React** en el Frontend, alojada en la red perimetral global de **Vercel**.

### Adaptación del Patrón MVC a Entornos Serverless
* **Modelo (M):** Reside completamente en la base de datos PostgreSQL de Supabase. No se limita a tablas crudas; la lógica de integridad comercial se implementa mediante restricciones de control (CHECK constraints), desencadenadores (Triggers) escritos en PL/pgSQL y Vistas SQL que calculan dinámicamente datos de alta volatilidad (ej. stock real de kits compuestos).
* **Controlador (C):** Se distribuye de manera híbrida. Las operaciones transaccionales atómicas de alta prioridad (como cierres de caja y cuadres) se ejecutan del lado del servidor mediante Procedimientos Almacenados (RPC en Supabase) para evitar condiciones de carrera. La orquestación del estado de la aplicación, control de flujos de pantalla y consumo de APIs se maneja en el Frontend mediante Custom Hooks de React y contextos globales.
* **Vista (V):** Componentes funcionales SPA de React estructurados bajo diseño atómico, optimizados mediante memorización (`useMemo`, `useCallback`) para responder en milisegundos en flujos de facturación rápidos.

> **Estrategia de Escalabilidad Corporativa (Multi-Empresa / Multi-Sucursal):**
> Para que este sistema sirva a empresas grandes en el futuro, todas las tablas maestras incorporan una columna `sucursal_id UUID`. La separación de datos se maneja a nivel de infraestructura mediante las políticas de seguridad de filas de PostgreSQL (**Row Level Security - RLS**). Cuando un cajero inicia sesión, Supabase filtra de forma nativa e invisible los registros a los que tiene acceso, asegurando aislamiento absoluto de datos entre locales sin alterar el código del Frontend.

---

## 2. Estructura de Directorios del Proyecto Front-End (React)

Estructura modular orientada a dominios de negocio. El objetivo es que un cambio en las reglas comerciales del módulo POS no afecte el módulo de asistencia o administración del personal.

```text
src/
├── api/                  # Clientes de servicios externos y configuración de Supabase
│   └── supabaseClient.ts # Inicialización del cliente Supabase y listeners globales
├── assets/               # Recursos estáticos (imágenes, logotipos locales, estilos globales)
├── components/           # Componentes UI reutilizables (Botones, Modales, Inputs, Tablas)
├── context/              # Contextos globales para la gestión de estados cruzados
│   ├── AuthContext.tsx   # Estado de sesión, permisos y RLS claims del usuario
│   └── CashContext.tsx   # Estado global del turno de caja actual (Abierto/Cerrado)
├── features/             # Dominios de negocio aislados (Patrón modular)
│   ├── dashboard/        # Gráficos, métricas Kpis y resúmenes de auditoría
│   ├── hr/               # Gestión de personal, tracking de asistencia y comisiones
│   ├── inventory/        # ABM de productos, proveedores y gestión recursiva de Kits
│   └── pos/              # Punto de venta, gestión de carrito, cobros rápidos y emisión de tickets
│       ├── components/   # UI específica del POS (Grid de productos, barra lateral del ticket)
│       ├── hooks/        # useCart.ts (Manejo de estados de venta en memoria)
│       └── services/     # posController.ts (Llamadas a Supabase y RPC de facturación)
├── routes/               # Configuración de enrutamiento y guardias de seguridad por rol
└── utils/                # Formateadores de moneda, fechas locales y funciones matemáticas
```

---

## 3. Diseño Detallado de Datos: Control de Caja y Relación de Kits

A continuación se especifican las estructuras esenciales para soportar las operaciones críticas del ERP: el control milimétrico del flujo de caja (evitando pérdidas económicas) y la resolución en cascada del inventario de Packs promocionales.

### Modelo de Control de Caja (Flujo Diario)

| Campo | Tipo de Dato | Restricciones | Propósito Comercial / Técnico |
| :--- | :--- | :--- | :--- |
| **id** | UUID | PRIMARY KEY | Identificador único global del turno de operación. |
| **sucursal_id** | UUID | FOREIGN KEY | Clave de aislamiento para operaciones multi-sucursal. |
| **usuario_id** | UUID | FOREIGN KEY | Cajero responsable de salvaguardar el efectivo del turno. |
| **monto_apertura** | DECIMAL(10,2) | `>= 0` | Fondo de caja base inicial ingresado obligatoriamente por el cajero. |
| **monto_cierre_real** | DECIMAL(10,2) | NULLABLE, `>= 0` | Dinero físico contado e ingresado manualmente al cerrar el turno. |
| **estado** | VARCHAR(10) | 'abierto', 'cerrado' | Bloquea o permite transacciones del POS asociadas al turno. |

### Esquema de Base de Datos para Productos Físicos, Servicios y Kits

Para optimizar el almacenamiento, se unifican los ítems comerciales en una única entidad diferenciada por tipo, permitiendo que un Kit contenga de manera indistinta tanto productos tangibles que descuentan stock como intangibles (servicios).

```sql
-- Consulta DDL para la inicialización del inventario y resolución de combos
CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sucursal_id UUID NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('producto', 'servicio', 'kit')),
    precio_venta DECIMAL(10, 2) NOT NULL CHECK (precio_venta >= 0),
    stock_actual INT DEFAULT 0 CHECK (stock_actual >= 0)
);

CREATE TABLE kit_composicion (
    kit_padre_id UUID REFERENCES items(id) ON DELETE CASCADE,
    componente_hijo_id UUID REFERENCES items(id) ON DELETE RESTRICT,
    cantidad_requerida INT NOT NULL CHECK (cantidad_requerida > 0),
    PRIMARY KEY (kit_padre_id, componente_hijo_id),
    CONSTRAINT chk_no_bucle CHECK (kit_padre_id <> componente_hijo_id)
);
```

---

## 4. Cronograma Detallado del Proyecto (Roadmap de Inicio a Fin)

Planificación organizada en 6 fases de desarrollo incremental bajo metodología ágil. Cada fase concluye con un hito técnico funcional desplegado en producción.

| Fase / Duración | Objetivos Técnicos y Tareas Clave | Estrategia Supabase / React | Entregable / Hito |
| :--- | :--- | :--- | :--- |
| **Fase 1: Infraestructura** (Semana 1) | - Inicialización del proyecto con Vite + TS + Tailwind.<br>- Provisionamiento PostgreSQL en Supabase.<br>- Configuración CI/CD en Vercel. | Definición de variables de entorno y esquemas iniciales de base de datos (`schema.sql`). | **Entregable:** Enlace activo de Vercel integrado con BD. |
| **Fase 2: Autenticación** (Semana 2) | - Configuración Supabase Auth.<br>- Creación de roles (admin, cajero, barbero).<br>- Activación de RLS en tablas. | Implementación de `AuthContext.tsx` y enrutamiento protegido. | **Entregable:** Login funcional con redirección por rol. |
| **Fase 3: Caja y Compras** (Semana 3-4) | - Control de turnos de caja (apertura, auditorías, ingresos/salidas).<br>- Registro de compras y proveedores. | Controladores de base de datos que validan el turno activo. | **Entregable:** Flujo de efectivo diario y cuadre. |
| **Fase 4: Catálogo y Kits** (Semana 5) | - CRUD de ítems.<br>- Asignación de dependencias de Kits.<br>- Vista SQL de cálculo dinámico de inventario. | Escritura de la vista transaccional `vista_stock_kits` y triggers. | **Entregable:** Inventario automatizado para combos. |
| **Fase 5: Módulo POS** (Semana 6-7) | - Vista táctil del carrito.<br>- Gestión de órdenes en memoria.<br>- Transacciones atómicas de venta. | RPC en Supabase para insertar venta y rebajar stock atómicamente. | **Entregable:** Terminal POS 100% operativa. |
| **Fase 6: RRHH y Cierre** (Semana 8) | - Asistencia de personal.<br>- Reporte de comisiones.<br>- Despliegue de la versión v1.0.0. | Consultas de agregación en base al ticket detalle por empleado. | **Entregable:** Dashboard interactivo y ciclo cerrado. |

---

## 5. Estrategia de Mitigación de Riesgos Críticos

Al operar en una arquitectura Serverless gratuita, se deben implementar salvaguardas específicas para garantizar que la aplicación se comporte como un software empresarial de alta gama.

* **Condiciones de Carrera en Caja:** Si dos cajeros registran ventas al mismo milisegundo, el stock podría quedar en negativo.
  * *Solución:* Nunca uses operaciones de actualización directas desde React (ej. `stock = stock - 1`). Toda disminución de inventario se ejecuta directamente en PostgreSQL usando sentencias relacionales puras protegidas por bloqueos implícitos de filas (`UPDATE items SET stock_actual = stock_actual - x WHERE id = y`).
* **Pérdida de Conexión a Internet:** Una barbería no puede dejar de atender si el internet falla temporalmente.
  * *Solución:* Estructurar el carrito de compras del POS utilizando el estado local de React persistido automáticamente en el `localStorage` del navegador. Si la red cae, el cajero puede seguir armando el ticket. Al retornar la conexión, un manejador de eventos sincroniza las colas transaccionales pendientes con Supabase.
