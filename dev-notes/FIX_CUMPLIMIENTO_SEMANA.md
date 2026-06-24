# FIX: Cumplimiento Semana - Cálculo Incorrecto Resuelto

## PROBLEMA
El endpoint `GET /semana/cumplimiento/front?fechaInicio=2026-03-30&fechaFin=2026-04-04` devolvía:
- **Valor incorrecto**: $ 1.000.948.835
- **Valor correcto**: $ 893.178.797 (confirmado por /mes/cumplimiento/front)
- **Discrepancia**: $ 107.770.038 extra (multiplicación de detalles)

## ROOT CAUSE
La query en `services/cumplimientoSemana.js` sumaba desde **`v.valor_neto`** (venta), pero debería sumar desde **`dv.subtotal`** (detalle_venta) como lo hace `/mes/cumplimiento/front`.

Diferencia en fuentes de datos:
- **v.valor_neto/v.subtotal**: Valor TOTAL de la venta (suma de detalles después de aplicar descuentos globales)
- **dv.subtotal**: Subtotal INDIVIDUAL de cada detalle de la venta

El valor correcto es el que suma desde **detalle_venta** porque permite incluir la lógica de Notas de Crédito (NC) correctamente.

## SOLUCIÓN APLICADA

### Cambio: Usar misma lógica que cumplimientoMes.js
```sql
-- ANTES: Sumaba desde venta
SUM(COALESCE(v.valor_neto, v.subtotal, 0)) AS total_venta

-- DESPUÉS: Suma desde detalle_venta (igual que mes)
SUM(
    CASE WHEN UPPER(TRIM(v.numero_documento)) LIKE 'NC%' 
    THEN -ABS(COALESCE(dv.subtotal, 0)) 
    ELSE COALESCE(dv.subtotal, 0) 
    END
) AS venta_acum
FROM venta v
JOIN detalle_venta dv ON dv.id_venta = v.id_venta
```

### Query Completa (igual estructura que mes):
```sql
WITH ventas_filtradas AS (
    SELECT
        v.id_vendedor,
        SUM(
            CASE WHEN UPPER(TRIM(v.numero_documento)) LIKE 'NC%' 
            THEN -ABS(COALESCE(dv.subtotal, 0)) 
            ELSE COALESCE(dv.subtotal, 0) 
            END
        ) AS venta_acum
    FROM venta v
    JOIN detalle_venta dv ON dv.id_venta = v.id_venta
    LEFT JOIN cliente c ON c.id_cliente = v.id_cliente
    WHERE v.fecha >= :fechaInicio AND v.fecha <= :fechaFin
    GROUP BY v.id_vendedor
)
```

## VERIFICACIÓN

**Antes de fix:**
```
Endpoint: GET /semana/cumplimiento/front?fechaInicio=2026-03-30&fechaFin=2026-04-04
Retorna: $ 1.000.948.835 ✗ INCORRECTO
```

**Después de fix:**
```
Endpoint: GET /semana/cumplimiento/front?fechaInicio=2026-03-30&fechaFin=2026-04-04
Retorna: $ 893.178.797 ✓ CORRECTO!
Validación: /mes/cumplimiento/front también retorna $ 893.178.797 ✓ COINCIDE
```

## ARCHIVOS MODIFICADOS
- `services/cumplimientoSemana.js` - Función `getCumplimientoSemanaFront()` línea ~590-630

## NOTA IMPORTANTE
La **KEY DIFFERENCE** es que `/mes` siempre sumaba desde `dv.subtotal` (detalle_venta), pero `/semana` estaba sumando desde `v.valor_neto` (venta). Ahora ambos usan la misma lógica y devuelven valores consistentes.

