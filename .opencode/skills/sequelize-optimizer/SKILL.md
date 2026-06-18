---
name: sequelize-optimizer
description: >
  DBA Senior especializado en optimización de queries Sequelize + PostgreSQL para Node.js.
  Usar SIEMPRE que el usuario mencione: query lenta, N+1, eager loading, include de Sequelize,
  findAll, findOne, raw queries, índices, EXPLAIN ANALYZE, consumo de memoria, instancias de
  modelos, asociaciones, JOIN, paginación con limit/offset, o cualquier consulta ORM que
  necesite mejora de rendimiento. Activar también ante "la consulta tarda", "está cargando
  todo", "demasiadas queries", "cómo optimizo esto" o "el servidor se pone lento al consultar".
  NUNCA cambiar el resultado del conjunto de datos; la integridad de los datos es absoluta.
---

# Sequelize Optimizer — DBA Senior PostgreSQL

> **Principio rector:** El conjunto de datos retornado debe ser **idéntico** antes y después
> de optimizar. Velocidad nunca a costa de correctitud.

---

## Protocolo de Optimización (orden obligatorio)

```
1. LEER la query actual completa
       ↓
2. DIAGNOSTICAR el anti-patrón (N+1 / SELECT * / instancias innecesarias / falta de índice)
       ↓
3. MEDIR con EXPLAIN ANALYZE (si hay acceso a la DB)
       ↓
4. PROPONER versión optimizada con Sequelize
       ↓
5. JUSTIFICAR la mejora (Big O / reducción de round-trips / ahorro de memoria)
       ↓
6. SUGERIR índices si el query plan muestra Seq Scan en tablas grandes
```

### Plantilla de reporte por query

```
## OPTIMIZACIÓN — <nombre del método o endpoint>

### Query original
```js
<código original>
```

### Diagnóstico
- Anti-patrón detectado: <N+1 | SELECT * | instancias completas | sin índice | ...>
- Round-trips a DB: <n>
- Columnas transferidas innecesariamente: <lista>

### Query optimizada
```js
<código mejorado>
```

### Mejora obtenida
- Round-trips: <antes> → <después>
- Columnas: <antes> → <después>
- Complejidad: O(<n²>) → O(<n>)
- Índice sugerido: <DDL o null>
```

---

## Anti-patrones a Evitar

### ❌ 1. SELECT * implícito

```js
// MAL: trae todas las columnas de todas las tablas en el JOIN
const ventas = await Venta.findAll({
  include: [{ model: Cliente }, { model: Producto }],
});

// BIEN: solo las columnas que el cliente necesita
const ventas = await Venta.findAll({
  attributes: ['id_venta', 'total', 'fecha'],
  include: [
    { model: Cliente,  attributes: ['id_cliente', 'nombre'] },
    { model: Producto, attributes: ['id_producto', 'descripcion', 'precio'] },
  ],
});
```

---

### ❌ 2. N+1 — el anti-patrón más costoso

```js
// MAL: 1 query para listar + N queries para cada relación
const ventas = await Venta.findAll();
for (const v of ventas) {
  v.detalles = await DetalleVenta.findAll({ where: { id_venta: v.id_venta } });
}
// → 1 + N queries al DB

// BIEN: 1 sola query con JOIN
const ventas = await Venta.findAll({
  attributes: ['id_venta', 'total', 'fecha'],
  include: [{
    model: DetalleVenta,
    attributes: ['cantidad', 'precio_unitario'],
    required: false, // LEFT JOIN — conserva ventas sin detalles
  }],
});
// → 1 query al DB
```

---

### ❌ 3. Instancias completas de modelo cuando solo se necesita lectura

```js
// MAL: Sequelize construye objetos completos con getters/setters/métodos
const rows = await Venta.findAll({ where: { estado: 'activo' } });
const data = rows.map(r => r.toJSON()); // trabajo extra innecesario

// BIEN: raw: true retorna POJOs, sin overhead de instancias
const rows = await Venta.findAll({
  attributes: ['id_venta', 'total'],
  where: { estado: 'activo' },
  raw: true,        // solo para lectura, sin necesidad de métodos del modelo
  nest: true,       // mantiene la jerarquía de includes como objetos anidados
});
```

> **Regla:** Usar `raw: true` cuando: solo lectura, sin llamadas a métodos de instancia
> (`.save()`, `.update()`, `.destroy()`), y el resultado va directo a una respuesta JSON.

---

### ❌ 4. Paginación sin índice en columna de orden

```js
// MAL: ORDER BY sin índice → Seq Scan + Sort en memoria
const rows = await Venta.findAll({
  order: [['fecha', 'DESC']],
  limit: 20,
  offset: 1000,
});

// BIEN: asegurar índice en la columna de orden
// Sequelize migration:
await queryInterface.addIndex('venta', ['fecha'], {
  name: 'idx_venta_fecha',
  using: 'BTREE',
});

// La query queda igual pero PostgreSQL usa Index Scan → O(log n) vs O(n)
```

---

### ❌ 5. `findAll` donde alcanza `findOne` o `count`

```js
// MAL: trae todos los registros para contar
const total = (await Venta.findAll({ where: { id_cliente } })).length;

// BIEN
const total = await Venta.count({ where: { id_cliente } });

// MAL: trae lista para verificar existencia
const existe = (await Venta.findAll({ where: { email } })).length > 0;

// BIEN
const existe = await Venta.findOne({
  attributes: ['id_venta'],  // mínimo posible
  where: { email },
  raw: true,
}) !== null;
```

---

### ❌ 6. Subqueries implícitas por `separate: true` sin necesidad

```js
// MAL: separate: true genera una subquery por cada registro padre
const clientes = await Cliente.findAll({
  include: [{ model: Venta, separate: true }], // N subqueries
});

// BIEN: usar include normal (JOIN) salvo que el resultado tenga duplicados de filas
// que distorsionen un COUNT o un SUM en el padre — ahí sí es válido separate: true
const clientes = await Cliente.findAll({
  attributes: ['id_cliente', 'nombre'],
  include: [{
    model: Venta,
    attributes: ['id_venta', 'total'],
    required: false,
  }],
});
```

---

## Estrategias de Eager Loading

### Matriz de decisión `required` / `separate`

| Escenario | `required` | `separate` | Resultado SQL |
|-----------|-----------|-----------|---------------|
| Quiero todos los padres aunque no tengan hijos | `false` | `false` | LEFT JOIN |
| Solo padres que tengan al menos un hijo | `true` | `false` | INNER JOIN |
| HasMany con COUNT/SUM en padre que se distorsiona con JOIN | `false` | `true` | subquery por padre |
| Relación polimórfica o tabla muy grande que genera producto cartesiano | `false` | `true` | subquery por padre |

---

### Eager loading anidado (relaciones de 3 niveles)

```js
// Venta → DetalleVenta → Producto → Categoria
const ventas = await Venta.findAll({
  attributes: ['id_venta', 'fecha', 'total'],
  include: [{
    model: DetalleVenta,
    attributes: ['cantidad', 'precio_unitario'],
    required: false,
    include: [{
      model: Producto,
      attributes: ['nombre', 'sku'],
      required: false,
      include: [{
        model: Categoria,
        attributes: ['nombre'],
        required: false,
      }],
    }],
  }],
  raw: true,
  nest: true,
});
```

> **Advertencia:** Más de 3 niveles de anidación suele indicar un problema de diseño.
> Considerar vistas materializadas o queries raw con CTE en PostgreSQL.

---

### Filtrar en el include sin perder registros padre

```js
// Quiero todos los clientes, pero solo sus ventas del mes actual
const clientes = await Cliente.findAll({
  attributes: ['id_cliente', 'nombre'],
  include: [{
    model: Venta,
    attributes: ['id_venta', 'total', 'fecha'],
    required: false,           // LEFT JOIN — no excluye clientes sin ventas este mes
    where: {
      fecha: {
        [Op.gte]: startOfMonth,
        [Op.lte]: endOfMonth,
      },
    },
  }],
});

// ⚠️ required: true aquí convertiría el LEFT en INNER y excluiría clientes sin ventas
```

---

### Paginación eficiente con `findAndCountAll`

```js
const { rows, count } = await Venta.findAndCountAll({
  attributes: ['id_venta', 'total', 'fecha'],
  where: filtros,
  include: [{
    model: Cliente,
    attributes: ['nombre'],
    required: false,
  }],
  limit,
  offset: (page - 1) * limit,
  order: [['fecha', 'DESC']],
  distinct: true,   // crítico cuando hay includes HasMany — evita count inflado
  raw: true,
  nest: true,
});
```

> `distinct: true` es **obligatorio** en `findAndCountAll` con includes HasMany o
> BelongsToMany, de lo contrario el `count` multiplica filas por los hijos.

---

### Raw query con CTE cuando Sequelize no alcanza

```js
// Para queries complejas: ventana, recursión, o más de 3 JOINs
const [results] = await sequelize.query(
  `
  WITH resumen AS (
    SELECT
      v.id_venta,
      v.fecha,
      SUM(dv.cantidad * dv.precio_unitario) AS total_calculado
    FROM venta v
    JOIN detalle_venta dv ON dv.id_venta = v.id_venta
    GROUP BY v.id_venta, v.fecha
  )
  SELECT * FROM resumen
  WHERE total_calculado <> v.total  -- detecta descuadres
  ORDER BY fecha DESC
  LIMIT :limit OFFSET :offset
  `,
  {
    replacements: { limit, offset },
    type: QueryTypes.SELECT,
  }
);
```

---

## Checklist de Optimización de Queries

Ejecutar en este orden antes de dar una query por optimizada:

### Fase 1 — Columnas

- [ ] ¿Se especifica `attributes` en el modelo raíz? (sin `SELECT *`)
- [ ] ¿Se especifica `attributes` en **cada** `include`?
- [ ] ¿Se excluyen columnas de gran tamaño (`TEXT`, `JSONB`, `BYTEA`) si no se usan?

### Fase 2 — Joins y relaciones

- [ ] ¿Se usa `include` en lugar de loop + query separado? (resuelve N+1)
- [ ] ¿El valor de `required` es correcto (LEFT vs INNER)?
- [ ] ¿Se usa `separate: true` solo cuando hay distorsión de COUNT/SUM?
- [ ] ¿Los includes anidados tienen máximo 3 niveles?

### Fase 3 — Lectura vs. escritura

- [ ] Si es solo lectura → ¿se usa `raw: true`?
- [ ] Si hay includes y `raw: true` → ¿se usa `nest: true`?
- [ ] ¿Se evita `.toJSON()` manual en arrays grandes?

### Fase 4 — Paginación y orden

- [ ] ¿Se usa `limit` y `offset` en toda query de lista?
- [ ] ¿Se usa `distinct: true` en `findAndCountAll` con HasMany?
- [ ] ¿Existe un índice en la columna de `ORDER BY`?

### Fase 5 — Índices en PostgreSQL

```sql
-- Verificar si la columna tiene índice
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = '<tabla>' AND indexdef LIKE '%<columna>%';

-- EXPLAIN ANALYZE para ver el query plan
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
<query SQL generado por Sequelize — activar logging: console.log>;
```

Señales de alerta en el plan:
- `Seq Scan` en tabla > 10k filas → necesita índice
- `Hash Join` con alto `rows` estimado → revisar selectividad del filtro
- `Sort` con `external merge` → ORDER BY sin índice, memoria insuficiente

### Fase 6 — Índices sugeridos (DDL Sequelize)

```js
// Migration boilerplate para índices comunes
await queryInterface.addIndex('venta', ['fecha'], {
  name: 'idx_venta_fecha', using: 'BTREE',
});
await queryInterface.addIndex('venta', ['id_cliente', 'estado'], {
  name: 'idx_venta_cliente_estado', using: 'BTREE', // índice compuesto
});
await queryInterface.addIndex('detalle_venta', ['id_venta'], {
  name: 'idx_detalle_venta_id_venta', using: 'BTREE',
});
// Índice parcial: solo filas activas (reduce tamaño del índice)
await queryInterface.addIndex('venta', ['fecha'], {
  name: 'idx_venta_fecha_activo',
  where: { estado: 'activo' },
});
```

---

## Referencias rápidas

| Situación | Solución |
|-----------|----------|
| N+1 queries | `include` con `attributes` explícitos |
| Solo lectura, sin métodos de modelo | `raw: true, nest: true` |
| Count inflado con HasMany | `distinct: true` en `findAndCountAll` |
| Query lenta en tabla grande | `EXPLAIN ANALYZE` + índice BTREE |
| JOIN distorsiona agregaciones | `separate: true` o raw CTE |
| Más de 3 niveles de anidación | Vista materializada o raw query con CTE |
| Existencia de registro | `findOne({ attributes: ['id'] })` o `count` |

- Motor: **PostgreSQL 14+** — aprovechar índices parciales, `BRIN` para series de tiempo
- Logging de queries en dev: `sequelize = new Sequelize({ logging: console.log })`
- Tolerancia de latencia aceptable por query: **< 100ms** en producción bajo carga normal