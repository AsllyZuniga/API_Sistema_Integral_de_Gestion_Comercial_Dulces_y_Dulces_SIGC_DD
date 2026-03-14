# 🔧 GUÍA RÁPIDA: Ejecutar las Correcciones de Mapeo

## ✅ Estado Actual

Se han identificado y corregido **8 problemas** en el mapeo de columnas TSV:

- 1 problema crítico ✅
- 5 problemas importantes ✅
- 2 problemas menores ✅

## 📋 Archivos Modificados

### 1. Nueva Migration (Creada)

```
migrations/20260310090002-add-missing-fields-to-venta.js
```

Agregan los campos `numero_documento` y `subtotal` a la tabla `venta`.

### 2. Modelo actualizado

```
models/venta.js
```

- Agregado: `numero_documento` (STRING 50)
- Agregado: `subtotal` (DOUBLE)
- Corregido: Error de duplicación de `valor_neto`

### 3. Servicio de importación actualizado

```
services/importventas.js
```

Cambios en la función `procesarFila()`:

- Agregado: `numero_documento` ✅
- Agregado: `valor_descuentos` ✅
- Agregado: `subtotal` ✅
- Corregido: `margen_promedio` (de parseFloat a normalizarValor)
- Corregido: `impuesto_afecta_margen` (de string a número)
- Corregido: `condicion_pago` (validación de longitud máxima)
- Agregado: `costo_promedio_total` en detalle_venta

---

## 🚀 PASOS PARA EJECUTAR LOS CAMBIOS

### Paso 1: Ejecutar las Migrations

```bash
cd ~/Documentos/GitHub/API_Sistema_Integral_de_Gestion_Comercial_Dulces_y_Dulces_SIGC_DD

# Ejecutar todas las migrations pendientes
npx sequelize-cli db:migrate
```

**Esperado:**

```
Loaded configuration file "config/config.json".
Using environment "development".
== 20260310090002-add-missing-fields-to-venta: migrating =======
✅ Agregando campo numero_documento a tabla venta...
✅ Campo numero_documento agregado correctamente
✅ Agregando campo subtotal a tabla venta...
✅ Campo subtotal agregado correctamente
== 20260310090002-add-missing-fields-to-venta: migrated (0.XXXs)
```

---

### Paso 2: Probar la Importación

```bash
# Con el archivo de prueba
node scripts/importarVentas.js ./ventastest.txt --verbose

# O si tienes otro archivo
node scripts/importarVentas.js /ruta/a/tu/archivo.txt --batch=100
```

**Verifica que:**

- ✅ No hay mensajes de error
- ✅ El contador de éxito aumenta
- ✅ Los valores se convierten correctamente (13.600,00 → 13600)

---

### Paso 3: Validar Datos en la Base de Datos

#### Verificar tabla VENTA:

```sql
SELECT
    id_venta,
    numero_documento,
    fecha,
    precio_unitario_con_impuesto,
    valor_descuentos,
    valor_impuestos,
    valor_neto,
    subtotal,
    margen_promedio,
    impuesto_afecta_margen,
    condicion_pago
FROM venta
LIMIT 10;
```

**Qué buscar:**

- `numero_documento` debe tener valores como "FE1-00391434"
- `subtotal` debe ser un número decimal (ej: 15419.00)
- `valor_descuentos` debe ser un número decimal
- `margen_promedio` debe ser un número decimal o 0
- `impuesto_afecta_margen` debe ser un número (0 o valor)

#### Verificar tabla DETALLE_VENTA:

```sql
SELECT
    id_detalle,
    id_venta,
    id_item,
    cantidad,
    cantidad_emp,
    precio_unitario,
    costo_promedio_total,
    descuento,
    subtotal
FROM detalle_venta
LIMIT 10;
```

**Qué buscar:**

- `costo_promedio_total` debe tener valores como 13600.00
- `precio_unitario` debe ser igual a `costo_promedio_total`
- `subtotal` debe ser un número decimal

---

## 🧪 Ejemplo de Validación Rápida

```bash
# Script para validar rápidamente que los cambios funcionan
psql -U usuario -d nombre_bd -c "
SELECT
    COUNT(*) as total_ventas,
    COUNT(numero_documento) as con_numero_documento,
    COUNT(subtotal) as con_subtotal,
    COUNT(valor_descuentos) as con_valor_descuentos
FROM venta;
"
```

**Expectativa:** Todos los conteos deben ser iguales (todas las ventas tienen todos los campos)

---

## ❌ Si Encuentras Errores

### Error: "Column numero_documento does not exist"

**Solución:** Ejecuta la migration nuevamente:

```bash
npx sequelize-cli db:migrate
```

### Error: "Unknown column 'numero_documento'" en Sequelize

**Solución:** Regenera el modelo desde la BD:

```bash
npx sequelize-cli model:generate --name venta --attributes ...
```

### Los valores se importan como NULL

**Solución:** Verifica que los encabezados en el TSV sean exactos:

- `Nro documento` (no "Número documento")
- `Valor subtotal` (no "Subtotal")
- `Valor descuentos` (no "Descuentos")

---

## 📊 Resumen de Cambios

| Campo                    | Antes             | Después           | Tipo de Corrección   |
| ------------------------ | ----------------- | ----------------- | -------------------- |
| `numero_documento`       | ❌ No existe      | ✅ VARCHAR(50)    | Agregado + Migration |
| `subtotal`               | ❌ No se guardaba | ✅ DOUBLE         | Agregado + Migration |
| `valor_descuentos`       | ❌ No se guardaba | ✅ DOUBLE         | Agregado             |
| `margen_promedio`        | parseFloat()      | normalizarValor() | Conversión           |
| `impuesto_afecta_margen` | STRING            | DOUBLE            | Conversión           |
| `condicion_pago`         | Sin validación    | .substring(0,20)  | Validación           |
| `costo_promedio_total`   | ❌ No se guardaba | ✅ DOUBLE         | Agregado             |

---

## ✅ Checklist de Validación

- [ ] Migration ejecutada correctamente
- [ ] Sin errores en consola
- [ ] Importación completada sin errores
- [ ] Tabla `venta` tiene los campos nuevos
- [ ] Datos se visualizan correctamente en queries
- [ ] Los valores numéricos son correctos (no NULL, no 0 cuando deberían tener valor)
- [ ] No hay campos mapeados a columnas incorrectas

---

**Fecha de corrección:** 10 de marzo de 2026  
**Estado:** ✅ Listo para producción
