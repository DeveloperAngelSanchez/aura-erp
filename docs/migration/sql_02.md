# Migración 02 - Vista de Inventario Dinámico para Combos (Kits)

* **Fecha:** 2026-07-18
* **Descripción:** Implementación de la vista SQL recursiva para calcular dinámicamente el stock disponible de kits en base al inventario de sus componentes individuales.
* **Fases del Plan Asociadas:** Paso 3.1: Módulo de Catálogo.

---

## Consultas SQL Ejecutadas

### 1. Vista de Stock Dinámico para Kits
```sql
CREATE OR REPLACE VIEW vista_stock_kits AS
WITH kit_stock_por_componente AS (
  SELECT 
    kc.kit_padre_id,
    FLOOR(c.stock_actual / kc.cantidad_requerida) AS stock_posible_por_componente
  FROM public.kit_composicion kc
  JOIN public.items c ON kc.componente_hijo_id = c.id
  WHERE c.tipo = 'producto' -- Solo los productos físicos limitan el stock del kit
)
SELECT 
  p.id AS kit_id,
  COALESCE(MIN(kspc.stock_posible_por_componente), 0)::INTEGER AS stock_calculado
FROM public.items p
LEFT JOIN kit_stock_por_componente kspc ON p.id = kspc.kit_padre_id
WHERE p.tipo = 'kit'
GROUP BY p.id;
```
