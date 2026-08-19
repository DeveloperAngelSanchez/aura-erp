# Aura ERP - Directrices e Inicialización del Proyecto

Este archivo contiene las reglas fundamentales de desarrollo, diseño visual y credenciales para el proyecto Aura ERP/POS. Cualquier agente de IA que trabaje en esta base de código debe seguir estas directrices estrictamente.

---

## 1. Reglas de UI/UX y Estilos Visuales

### A. Paleta de Colores y Temas (Aura Light Theme)
* **Prohibido el tema oscuro genérico:** El sistema interior (los tableros, tablas y el POS) debe ser **100% Tema Claro (Light Theme)**, emulando la estética de la Imagen 3 (Zenxius).
* **Fondo Principal:** Gris claro muy limpio/suave (`bg-slate-50` / `#F8FAFC`).
* **Tarjetas y Contenedores:** Fondo blanco puro (`bg-white`) con bordes finos de separación (`border-slate-200`) y sombras muy tenues/sutiles (`shadow-sm`).
* **Barra Lateral (Sidebar):** Fondo claro (`bg-white` o `bg-slate-50`) con bordes finos, textos limpios y oscuros, eliminando fondos oscuros.
* **Azul Institucional (Aura Blue):** El color de acento principal debe ser el azul cobalto de la pantalla de login (Imagen 1/2):
  * Primario: `#2563EB` (Tailwind `blue-600`)
  * Hover: `#1D4ED8` (Tailwind `blue-700`)
  * Light Accent/Glow: `#EFF6FF` (Tailwind `blue-50`)
* **Badges de Estado:**
  * Éxito: Fondo verde claro (`bg-emerald-50` / `text-emerald-700`)
  * Borrador/Pendiente: Fondo naranja claro (`bg-amber-50` / `text-amber-700`)
  * Crítico/Agotado: Fondo rojo claro (`bg-rose-50` / `text-rose-700`)

### B. Uso de Iconos Vectoriales
* **Prohibido el uso de Emojis:** Los emojis (`📦`, `📊`, `🧴`, etc.) quedan strictly prohibidos en la interfaz de usuario de producción.
* **Librería de Iconos:** Utilizar **`lucide-react`** para cargar iconos SVG vectoriales y profesionales de forma limpia.

---

## 2. Pautas de Trabajo y Testeo Rápido

* **No Ejecutar Navegador Automatizado:** Para agilizar el proceso de desarrollo y entrega, **NO** inicies agentes de navegación automática (`browser_subagent`) para probar los flujos a menos que el usuario lo pida explícitamente.
* **Verificación Obligatoria por Compilación y Linting:** Valida la corrección del código utilizando `npx tsc --noEmit` y `npm run lint` en la terminal para asegurarte de que no existan errores de tipado, advertencias ni imports no utilizados.
* **Cero Errores al Finalizar (Regla Estricta e Inviolable):** Queda estrictamente prohibido dar por concluida cualquier tarea o responder al usuario si se dejan errores de compilación, advertencias (warnings), imports sin uso, problemas de sintaxis de módulos (`verbatimModuleSyntax`) o fallos de linting en el código. El agente debe ser extremadamente estricto consigo mismo y ejecutar `npx tsc --noEmit && npm run lint` antes de entregar cualquier cambio. Toda modificación debe entregarse 100% limpia de errores y verificada.

---

## 3. Credenciales de Acceso para Pruebas

Para el ingreso del usuario y pruebas directas del sistema:
* **Usuario Administrador:** `admin@aura-erp.com`
* **Contraseña:** `password123`



* **Usuario Administrador:** `lele@admin.aura.pe`
* **Contraseña:** `password123`