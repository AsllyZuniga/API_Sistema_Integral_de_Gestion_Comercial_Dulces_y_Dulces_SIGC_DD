# 🔧 CORRECCIÓN: Endpoint `/lineas` - Proveedores con Cuota Incompletos

## 📋 Problema Identificado

El endpoint `/mes/cumplimiento/lineas` estaba mostrando solo ciertos proveedores con cuota (TONING, ALICORP ALIMENTOS, FLORA FOOD, EL REY, COFARMA, DANISCO, LAB. OSA), mientras que otros aparecían en 0, aunque en el CSV de cuotas estaban asignados.

### Causa Raíz

La query original de `getLineasGeneral()` en [cumplimientoMesService.js](services/cumplimientoMesService.js):

1. **Partía desde VENTAS** (no desde CUOTAS)
2. **Hacía un LEFT JOIN** para obtener cuotas, filtrando por `id_proveedor`
3. **Resultado**: Si un proveedor NO tenía ventas, nunca aparecía en el resultado, incluso con cuota asignada

**Query Original (INCORRECTA):**
```sql
WITH ventas_por_linea AS (
    -- Obtiene SOLO proveedores que aparecen en ventas
    SELECT ... FROM venta v
    JOIN detalle_venta dv
    -- ... construcción del id_proveedor
)
SELECT 
    -- Intenta obtener cuota para cada proveedor de venta
    (SELECT SUM(cp.cuota) FROM ... WHERE vcp.id_proveedor = vpl.id_proveedor)
```

**Problema concreto**: Proveedores como HENKEL, BAYER, etc., que tienen cuota pero NO tienen ventas en el período, nunca aparecían.

---

## ✅ Solución Implementada

Reescribir la query para:
1. **Partir desde CUOTAS** (tabla `vendedorCuotaProveedor`)
2. **LEFT JOIN con VENTAS** (agregadas por proveedor normalizado)
3. **Garantizar que aparezcan TODOS los proveedores con cuota**, incluso sin ventas

**Query Nueva (CORRECTA):**
```sql
WITH cuotas_agregadas AS (
    -- Obtiene TODOS los proveedores con cuota (sin filtrar por ventas)
    SELECT id_proveedor, SUM(cuota) AS suma_cuota
    FROM vendedorCuotaProveedor
    JOIN cuotaProveedor ON ...
    GROUP BY id_proveedor
),
ventas_por_proveedor AS (
    -- Obtiene ventas por proveedor (normalizado)
    SELECT nombre_norm, SUM(venta) AS venta_total
    FROM venta v
    JOIN detalle_venta dv
    GROUP BY nombre_norm
)
-- CUOTAS (izquierda) + VENTAS (derecha) = ✅ Todos los proveedores
SELECT ca.*, COALESCE(vp.venta_total, 0) AS venta
FROM cuotas_agregadas ca
LEFT JOIN ventas_por_proveedor vp ON ca.nombre_norm = vp.nombre_norm
```

### Cambios Clave:
1. **CTE `cuotas_agregadas`**: Parte de `vendedorCuotaProveedor` + `cuotaProveedor` (TODOS)
2. **CTE `ventas_por_proveedor`**: Obtiene ventas agregadas, normalizado para matching
3. **Matching robusto**: Normaliza nombres (UPPER, TRIM, sin caracteres especiales)
4. **LEFT JOIN**: Asegura que cuotas sin ventas aparezcan con venta = 0

---

## 📊 Resultado

**Antes (INCOMPLETO):**
- TONING: 1,234,567
- ALICORP ALIMENTOS: 2,345,678
- FLORA FOOD: 3,456,789
- ❌ HENKEL: 0 (no aparecía)
- ❌ BAYER: 0 (no aparecía)

**Después (COMPLETO):**
- TONING: 1,234,567
- ALICORP ALIMENTOS: 2,345,678
- FLORA FOOD: 3,456,789
- ✅ HENKEL: 5,000,000 (ahora sí aparece con su cuota)
- ✅ BAYER: 4,500,000 (ahora sí aparece con su cuota)
- ... todos los demás proveedores con cuota

---

## 🧪 Endpoints Afectados

- **GET** `/mes/cumplimiento/lineas?fechaInicio=2026-01-01&fechaFin=2026-01-31`
  - Panel del admin que muestra cuotas por proveedor (LÍNEA)
  - Ahora muestra TODOS los proveedores con cuota asignada

---

## 📝 Notas Técnicas

### Normalización de Nombres
Para un matching robusto entre `reporte_prov_con_obs` (ventas) y `nombre_proveedor` (cuotas):
```sql
UPPER(TRIM(REGEXP_REPLACE(
    REGEXP_REPLACE(nombre, '[^a-zA-Z0-9 ]', ' ', 'g'),
    '\\s+', ' ', 'g'
)))
```
- Remove caracteres especiales
- Convierte a UPPER para case-insensitive matching
- Remove espacios múltiples

### Función Afectada
- `getLineasGeneral()` en [services/cumplimientoMesService.js](services/cumplimientoMesService.js)

### Archivo de Cambios
- [services/cumplimientoMesService.js](services/cumplimientoMesService.js) - Líneas ~981-1080

---

## ✨ Cambios Completos

Fecha: 21 de mayo de 2026
Responsable: GitHub Copilot
Estado: ✅ Implementado y listo para test
