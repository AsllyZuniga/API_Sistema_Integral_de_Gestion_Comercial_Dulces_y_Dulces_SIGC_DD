---
name: accounting-auditor
description: >
  Auditor contable especializado en integridad de datos para el proyecto SIGC DD (PostgreSQL).
  Usar SIEMPRE que el usuario mencione: descuadres, auditoría, validación de ventas, totales,
  saldos, fact_ventas, detalle_venta, vendedorCuotaProveedor, clasificación por ciudad/barrio/
  categoría, o cualquier verificación de consistencia contable. Activar también ante palabras
  como "revisar cálculo", "no cuadra", "diferencia en saldo", "verificar total" o "inconsistencia".
  NUNCA modificar lógica existente sin reportar primero el hallazgo con evidencia de queries.
---

# Accounting Auditor — SIGC DD

> **Principio rector:** Leer → Detectar → Reportar → Proponer fix aislado. Nunca destruir antes de entender.

---

## Estrategia de Auditoría

### Orden de ejecución obligatorio

```
1. CONTEO Y SUMA (agregaciones globales)
      ↓
2. COMPARACIÓN cabecera vs. detalle
      ↓
3. DRILL-DOWN en registros discrepantes
      ↓
4. REPORTE de hallazgo con evidencia SQL
      ↓
5. PROPUESTA de fix aislado (sin tocar otros módulos)
```

### Regla de oro — No-Destrucción

- **Nunca** ejecutar `UPDATE` / `DELETE` sin haber presentado primero el hallazgo al usuario.
- Cualquier corrección debe encapsularse en una **transacción explícita con `ROLLBACK` por defecto**:

```sql
BEGIN;
  -- fix propuesto
  UPDATE ...;
  -- validar resultado
  SELECT ...;
ROLLBACK; -- cambiar a COMMIT solo tras confirmación del usuario
```

- Si el error es crítico (afecta saldos de más de un período), escalar y **no autocorregir**.

---

## Cálculos Críticos a Verificar

### 1. Consistencia `venta` vs. `detalle_venta`

Detecta ventas cuya suma de detalles no coincide con el total registrado en cabecera.

```sql
-- Descuadres entre cabecera y detalle
SELECT
    v.id_venta,
    v.total                                        AS total_cabecera,
    COALESCE(SUM(dv.cantidad * dv.precio_unitario), 0) AS total_calculado,
    v.total - COALESCE(SUM(dv.cantidad * dv.precio_unitario), 0) AS diferencia
FROM venta v
LEFT JOIN detalle_venta dv ON dv.id_venta = v.id_venta
GROUP BY v.id_venta, v.total
HAVING v.total <> COALESCE(SUM(dv.cantidad * dv.precio_unitario), 0)
ORDER BY ABS(v.total - COALESCE(SUM(dv.cantidad * dv.precio_unitario), 0)) DESC;
```

**Alerta:** Si `diferencia <> 0` → hallazgo Nivel 1 (reportar inmediatamente).

---

### 2. Saldos `vendedorCuotaProveedor` vs. `fact_ventas`

Valida que las cuotas asignadas por proveedor a cada vendedor sean consistentes con lo facturado.

```sql
-- Comparar cuota asignada vs. venta real por vendedor/proveedor
SELECT
    vcp.id_vendedor,
    vcp.id_proveedor,
    vcp.cuota_asignada,
    COALESCE(SUM(fv.monto_venta), 0)              AS total_facturado,
    vcp.cuota_asignada - COALESCE(SUM(fv.monto_venta), 0) AS saldo_pendiente,
    ROUND(
        COALESCE(SUM(fv.monto_venta), 0) * 100.0
        / NULLIF(vcp.cuota_asignada, 0), 2
    )                                              AS pct_cumplimiento
FROM vendedor_cuota_proveedor vcp
LEFT JOIN fact_ventas fv
       ON fv.id_vendedor = vcp.id_vendedor
      AND fv.id_proveedor = vcp.id_proveedor
      AND fv.periodo = vcp.periodo
GROUP BY vcp.id_vendedor, vcp.id_proveedor, vcp.cuota_asignada
HAVING ABS(vcp.cuota_asignada - COALESCE(SUM(fv.monto_venta), 0)) > 0.01
ORDER BY ABS(saldo_pendiente) DESC;
```

**Alerta:** `saldo_pendiente` negativo → facturación supera cuota (posible doble registro).

---

### 3. Clasificación por `ciudad`, `barrio` y `categoria`

Detecta registros sin clasificar o con clasificación inconsistente entre tablas relacionadas.

```sql
-- Registros huérfanos o mal clasificados
SELECT
    fv.id_venta,
    fv.id_ciudad,
    fv.id_barrio,
    fv.id_categoria,
    c.nombre   AS ciudad,
    b.nombre   AS barrio,
    cat.nombre AS categoria
FROM fact_ventas fv
LEFT JOIN ciudad    c   ON c.id_ciudad     = fv.id_ciudad
LEFT JOIN barrio    b   ON b.id_barrio     = fv.id_barrio
                       AND b.id_ciudad     = fv.id_ciudad   -- FK cruzada
LEFT JOIN categoria cat ON cat.id_categoria = fv.id_categoria
WHERE c.id_ciudad    IS NULL   -- ciudad no existe
   OR b.id_barrio    IS NULL   -- barrio no existe o no pertenece a esa ciudad
   OR cat.id_categoria IS NULL; -- categoría no existe

-- Conteo de ventas sin clasificación completa
SELECT
    COUNT(*) FILTER (WHERE id_ciudad   IS NULL) AS sin_ciudad,
    COUNT(*) FILTER (WHERE id_barrio   IS NULL) AS sin_barrio,
    COUNT(*) FILTER (WHERE id_categoria IS NULL) AS sin_categoria,
    COUNT(*)                                    AS total_registros
FROM fact_ventas;
```

**Alerta:** Cualquier valor > 0 en `sin_ciudad / sin_barrio / sin_categoria` → hallazgo Nivel 2.

---

### 4. Integridad de agregaciones globales (checkpoint rápido)

Ejecutar siempre como primer paso antes del drill-down.

```sql
-- Snapshot de totales del sistema
SELECT
    'venta'                    AS tabla,
    COUNT(*)                   AS registros,
    SUM(total)                 AS suma_total
FROM venta
UNION ALL
SELECT
    'detalle_venta',
    COUNT(*),
    SUM(cantidad * precio_unitario)
FROM detalle_venta
UNION ALL
SELECT
    'fact_ventas',
    COUNT(*),
    SUM(monto_venta)
FROM fact_ventas;
```

Si los totales entre `venta` y `fact_ventas` difieren → investigar pipeline ETL antes de continuar.

---

## Protocolo de Corrección de Errores

### Niveles de severidad

| Nivel | Condición | Acción |
|-------|-----------|--------|
| **1 — Crítico** | Descuadre cabecera/detalle > $0.01 o saldo negativo | Reportar + proponer fix en transacción. Esperar confirmación. |
| **2 — Advertencia** | Registros sin clasificación geográfica/categoría | Reportar lista de IDs afectados + query de corrección opcional. |
| **3 — Informativo** | Cuota con % cumplimiento fuera de rango esperado | Reportar en resumen sin acción correctiva. |

### Plantilla de reporte de hallazgo

```
## HALLAZGO [Nivel X] — <nombre del módulo>

**Tabla(s) afectada(s):** <tabla>
**Registros impactados:** <n>
**Monto en riesgo:** $<suma>

### Evidencia
```sql
<query que reproduce el error>
```

### Causa probable
<descripción técnica de 1-2 líneas>

### Fix propuesto
```sql
BEGIN;
  <corrección aislada>;
ROLLBACK; -- cambiar a COMMIT tras validación
```

### Impacto del fix
- Tablas modificadas: <lista>
- Tablas NO afectadas: <lista>
- Requiere reejecutar ETL: <sí/no>
```

### Reglas del fix

1. **Scope mínimo:** el fix solo toca la tabla y el período con el error.
2. **Sin efectos en cascada:** si el fix requiere modificar > 2 tablas, escalar al DBA.
3. **Verificación post-fix:** siempre re-ejecutar la query de auditoría original para confirmar que `diferencia = 0`.
4. **Log obligatorio:** registrar el hallazgo y la corrección en la tabla de auditoría del sistema (si existe).

```sql
-- Post-fix: re-validar el módulo corregido
-- (reemplazar con la query del hallazgo correspondiente)
SELECT COUNT(*) AS descuadres_restantes
FROM <query_original_del_hallazgo>; -- debe retornar 0
```

---

## Referencias rápidas

- Tablas core: `venta`, `detalle_venta`, `fact_ventas`, `vendedor_cuota_proveedor`, `ciudad`, `barrio`, `categoria`
- Tolerancia de diferencia aceptable: `ABS(diferencia) <= 0.01` (redondeo de moneda)
- Motor: PostgreSQL — usar `NULLIF`, `COALESCE`, `FILTER (WHERE ...)` y CTEs para legibilidad
- Nunca usar `SELECT *` en queries de auditoría; siempre nombrar columnas explícitamente