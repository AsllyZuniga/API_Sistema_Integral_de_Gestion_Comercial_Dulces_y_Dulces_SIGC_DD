# 📅 Guía Rápida: Manejo de Fechas en Cuotas de Categoría

## ¿Qué cambió?

Ahora puedes ingresar fechas de una forma **mucho más simple** usando el parámetro `mesAnio` en formato `YYYY-MM`. El sistema calculará automáticamente el primer y último día del mes.

---

## 📌 Formas de Ingresar Fechas

### ✅ RECOMENDADO: Usar `mesAnio` (YYYY-MM)

**Formato**: `YYYY-MM` (ej: `2026-03`)

El sistema automáticamente calcula:
- `fechaInicio`: Primer día del mes (ej: `2026-03-01`)
- `fechaFin`: Último día del mes (ej: `2026-03-31`)

#### Ejemplos:

**1. Importar cuotas (Postman o curl)**
```bash
curl -X POST http://localhost:3000/cuota-categoria-import/cargar \
  -F "archivo=@cuotas.csv" \
  -F "mesAnio=2026-03"
```

En **Postman**:
- Método: POST
- URL: `http://localhost:3000/cuota-categoria-import/cargar`
- Body → form-data:
  - `archivo`: Tu archivo CSV
  - `mesAnio`: `2026-03`

**2. Consultar cuotas por mes**
```bash
# Todos los vendedores
curl "http://localhost:3000/cuota-categoria/vendedores?mesAnio=2026-03"

# Vendedor específico
curl "http://localhost:3000/cuota-categoria/vendedor/0150?mesAnio=2026-03"

# Resumen general
curl "http://localhost:3000/cuota-categoria/general?mesAnio=2026-03"
```

---

### 🔄 ALTERNATIVA: Usar fechas completas (YYYY-MM-DD)

Si necesitas un rango específico que no sea todo el mes, puedes usar:
- `fechaInicio`: Formato `YYYY-MM-DD` (ej: `2026-03-15`)
- `fechaFin`: Formato `YYYY-MM-DD` (ej: `2026-03-20`)

```bash
# Importar cuotas con fechas específicas
curl -X POST http://localhost:3000/cuota-categoria-import/cargar \
  -F "archivo=@cuotas.csv" \
  -F "fechaInicio=2026-03-15" \
  -F "fechaFin=2026-03-20"

# Consultar cuotas con fechas específicas
curl "http://localhost:3000/cuota-categoria/general?fechaInicio=2026-03-15&fechaFin=2026-03-20"
```

---

### 🔧 AUTOMÁTICO: Sin parámetros de fecha

Si no especificas ningún parámetro de fecha, **se usa automáticamente el mes actual**:

```bash
# Usa mes actual sin parámetros
curl -X POST http://localhost:3000/cuota-categoria-import/cargar \
  -F "archivo=@cuotas.csv"

# Consulta mes actual
curl "http://localhost:3000/cuota-categoria/general"
```

---

## 📋 Resumen de Parámetros por Endpoint

### Importación de Cuotas

**POST** `/cuota-categoria-import/cargar`

| Parámetro | Tipo | Requerido | Formato | Descripción |
|-----------|------|-----------|---------|-------------|
| `archivo` | File | ✅ Sí | `.csv` | Archivo CSV con cuotas |
| `mesAnio` | Text | ❌ No | `YYYY-MM` | Mes-año (recomendado) |
| `fechaInicio` | Text | ❌ No | `YYYY-MM-DD` | Alternativa (si no usas mesAnio) |
| `fechaFin` | Text | ❌ No | `YYYY-MM-DD` | Alternativa (si no usas mesAnio) |

**POST** `/cuota-categoria-import/importar/nestle`

```json
{
  "rutaArchivo": "./cuotas.csv",
  "mesAnio": "2026-03"
}
```

---

### Consulta de Cuotas

**GET** `/cuota-categoria/general`  
**GET** `/cuota-categoria/vendedores`  
**GET** `/cuota-categoria/vendedor/:codigoVendedor`

Query Parameters:
```
?mesAnio=2026-03
// O alternativa:
?fechaInicio=2026-03-01&fechaFin=2026-03-31
```

---

## 💡 Ejemplos Prácticos

### Escenario 1: Importar cuotas de marzo 2026
```bash
curl -X POST http://localhost:3000/cuota-categoria-import/cargar \
  -F "archivo=@cuotasCategoriasMarzo.csv" \
  -F "mesAnio=2026-03"
```

### Escenario 2: Consultar cuota de un vendedor en marzo
```bash
curl "http://localhost:3000/cuota-categoria/vendedor/0150?mesAnio=2026-03"
```

### Escenario 3: Ver resumen general del mes
```bash
curl "http://localhost:3000/cuota-categoria/general?mesAnio=2026-03"
```

### Escenario 4: Comparar período específico (2 semanas)
```bash
curl "http://localhost:3000/cuota-categoria/general?fechaInicio=2026-03-01&fechaFin=2026-03-15"
```

---

## 🎯 Prioridad de Parámetros

Si proporcionas múltiples parámetros, se usa en este orden:

1. **`mesAnio`** (formato YYYY-MM) ⭐ PREFERIDO
2. **`fechaInicio` + `fechaFin`** (formato YYYY-MM-DD) Alternativa
3. **Mes actual** (si no se proporciona nada) Automático

---

## ❌ Errores Comunes

### ❌ Error: Formato incorrecto
```json
{
  "error": "Formato inválido para mesAnio. Usa YYYY-MM (ej: 2026-03). Recibido: \"03-2026\""
}
```
✅ **Solución**: Usa `2026-03` no `03-2026`

### ❌ Error: Mes inválido
```json
{
  "error": "Mes inválido: 13. Debe estar entre 01 y 12"
}
```
✅ **Solución**: Usa meses válidos (01-12)

### ❌ Error: Fechas incompletas
```
?fechaInicio=2026-03-01
(falta fechaFin)
```
✅ **Solución**: Si usas fechas completas, proporciona ambas o usa `mesAnio` en su lugar

---

## 🔄 Cómo Migrar si Usabas la Antigua Forma

### Antes (Hardcodeado):
```bash
curl -X POST http://localhost:3000/cuota-categoria-import/cargar \
  -F "archivo=@cuotas.csv" \
  -F "fechaInicio=2026-03-01" \
  -F "fechaFin=2026-03-31"
```

### Ahora (Simplificado):
```bash
curl -X POST http://localhost:3000/cuota-categoria-import/cargar \
  -F "archivo=@cuotas.csv" \
  -F "mesAnio=2026-03"
```

**Ventajas**:
- ✅ Menos parámetros
- ✅ Imposible equivocarse con el último día del mes
- ✅ Más legible y intuitivo
- ✅ Rápido cambiar de mes

---

## 📞 Necesitas Ayuda?

Si tienes dudas, consulta los endpoints de instrucciones:

```bash
# Ver instrucciones completas
curl http://localhost:3000/cuota-categoria-import/
```

Este retorna toda la documentación con ejemplos actualizados.
