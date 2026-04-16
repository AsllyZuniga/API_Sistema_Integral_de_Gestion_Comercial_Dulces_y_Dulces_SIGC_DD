# ✅ Validaciones Estrictas - Importación de Cuotas por Categoría

## 🔴 IMPORTANTE: MODO ESTRICTO

El nuevo sistema de importación opera en **MODO ESTRICTO** para evitar:
- ❌ Crear vendedores duplicados o inexistentes
- ❌ Crear categorías duplicadas o inexistentes
- ❌ Asignaciones incorrectas de cuotas
- ❌ Datos inconsistentes en la BD

---

## 📋 Proceso de Validación

### Paso 1: Lee el archivo CSV

```
⚙️ Parsea el CSV con delimitador ; (punto y coma)
⚙️ Normaliza cabeceras y datos
```

### Paso 2: Valida vendedores

```
✅ Extrae todos los códigos_vendedor del CSV
✅ Busca CADA código en la tabla vendedor
❌ Si alguno NO existe → CANCELA IMPORTACIÓN
```

**Ejemplo de error:**
```json
{
  "codigo": "9999",
  "nombre": "Vendedor Fantasma",
  "fila": 5,
  "mensaje": "Vendedor con código \"9999\" no existe en BD"
}
```

### Paso 3: Valida categorías

```
✅ Extrae todos los nombres de categoría del CSV
✅ Busca CADA nombre EXACTAMENTE en tabla categoria
❌ Si alguno NO coincide exactamente → CANCELA IMPORTACIÓN
```

**Importante:** Las búsquedas son **EXACTAS**, no parciales.

**Ejemplo de error:**
```json
{
  "nombreEsperado": "0300 - CAFE",           // Error: falta "1000-"
  "nombreEnBD": "0300 - 1000-CAFES",        // Nombre exacto en BD
  "codigoVendedor": "0150",
  "fila": 2,
  "mensaje": "Categoría \"0300 - CAFE\" no existe en BD"
}
```

### Paso 4: Si hay errores → CANCELA

```
🛑 NO se realizan cambios en la BD
🛑 Se retorna reporte detallado de qué falló
🛑 El usuario debe corregir el CSV y reintentar
```

### Paso 5: Si validación OK → Importa

```
✅ Procede con importación en transacción
✅ Crea/actualiza cuotas para cada vendedor-categoría
✅ Retorna resumen de cambios
```

---

## 🔍 Cómo Validar ANTES de Importar

Usa el endpoint de validación para revisar sin hacer cambios:

### curl

```bash
curl -X POST http://localhost:3000/cuota-categoria-import/validar \
  -F "archivo=@cuotas.csv" \
  -F "mesAnio=2026-03"
```

### Postman

1. POST a `http://localhost:3000/cuota-categoria-import/validar`
2. Body → form-data
3. `archivo` (File): Tu CSV
4. `mesAnio` (Text): `2026-03`
5. Send

### Respuesta (validación OK)

```json
{
  "success": true,
  "validacion": {
    "archivo": "cuotas.csv",
    "esValido": true,
    "totalFilas": 4,
    "totalCategorias": 14,
    "vendedoresValidos": [
      { "codigo": "0150", "nombre": "De La Cruz Meza", "id": 1 },
      { "codigo": "0173", "nombre": "Yama Marcillo", "id": 2 }
    ],
    "categoriasValidas": [
      "0300 - 1000-CAFES",
      "1201 - 1000-GALLETAS",
      "2950 - 2500-CHOCOLATES"
    ],
    "vendedoresNoEncontrados": [],
    "categoriasNoEncontradas": []
  }
}
```

### Respuesta (validación FALLA)

```json
{
  "success": false,
  "validacion": {
    "archivo": "cuotas.csv",
    "esValido": false,
    "vendedoresNoEncontrados": [
      {
        "codigo": "9999",
        "nombre": "Inexistente",
        "fila": 3,
        "mensaje": "Vendedor con código \"9999\" no existe en BD"
      }
    ],
    "categoriasNoEncontradas": [
      {
        "nombreEsperado": "CATEGORIA FALSA",
        "codigoVendedor": "0150",
        "fila": 2,
        "mensaje": "Categoría \"CATEGORIA FALSA\" no existe en BD"
      }
    ]
  }
}
```

---

## 📝 Pasos para Importar Correctamente

### 1. Prepara tu CSV

Estructura requerida:
```csv
codigo_vendedor;nombre;0300 - 1000-CAFES;1201 - 1000-GALLETAS;fecha_inicio;fecha_fin
0150;De La Cruz Meza;38090263;7155926;2026-03-01;2026-03-31
0173;Yama Marcillo;10500026;6886753;2026-03-01;2026-03-31
```

**Requisitos:**
- Delimitador: `;` (punto y coma)
- Columna 1: `codigo_vendedor` (debe existir en BD)
- Columna 2: `nombre` (del vendedor)
- Columnas 3+: Nombres de categorías exactos de BD
- Códigos de vendedor y categorías deben ser **EXACTOS**

### 2. Valida el archivo PRIMERO

```bash
curl -X POST http://localhost:3000/cuota-categoria-import/validar \
  -F "archivo=@cuotas.csv" \
  -F "mesAnio=2026-03"
```

**Si hay errores:**
- Lee el reporte detallado
- Corrige el CSV (vendedores/categorías inexistentes)
- Reintenta la validación
- Repite hasta que validación OK

### 3. Una vez validado, importa

```bash
curl -X POST http://localhost:3000/cuota-categoria-import/cargar \
  -F "archivo=@cuotas.csv" \
  -F "mesAnio=2026-03"
```

---

## ❌ Errores Comunes y Soluciones

### Error: Vendedor no encontrado

```
"Vendedor con código \"0150\" no existe en BD"
```

**Solución:**
1. Verifica el código_vendedor en la tabla `vendedor`
2. Asegúrate que coincida EXACTAMENTE (sin espacios extras)
3. El código es sensible a mayúsculas/minúsculas
4. Actualiza el CSV con el código correcto

### Error: Categoría no encontrada

```
"Categoría \"0300 - CAFES\" no existe en BD"
```

**Solución:**
1. Ve a la tabla `categoria` en la BD
2. Copia el nombre EXACTO de la categoría
3. En el CSV, reemplaza con el nombre exacto
4. **No se realizan búsquedas parciales** - debe ser idéntico

### Error: Delimitador incorrecto

Si ves columnas sin separar o datos mal parseados:

**Solución:**
1. Asegúrate que el CSV usa `;` (punto y coma)
2. NO uses `,` (coma)
3. En Excel: Guardar como CSV UTF-8 (delimitado por punto y coma)

### Error: Formato de fecha incorrecto

```
"Fecha debe estar en formato YYYY-MM-DD"
```

**Solución:**
1. Usa formato: `2026-03-01` (año-mes-día)
2. O usa parámetro `mesAnio=2026-03` que calcula automáticamente

---

## 📊 Respuesta Exitosa de Importación

```json
{
  "exitosa": true,
  "procesadas": 56,
  "actualizadas": 56,
  "errores": [],
  "validacion": {
    "esValido": true,
    "totalFilas": 4,
    "totalCategorias": 14,
    "vendedoresValidos": 4,
    "categoriasValidas": 14
  },
  "mensaje": "Se importaron 56 cuotas exitosamente"
}
```

---

## 🛡️ Garantías del Sistema

✅ **No duplica vendedores** - Valida que existan primero
✅ **No duplica categorías** - Valida que existan primero
✅ **Búsqueda exacta** - No hay coincidencias parciales
✅ **Transaccional** - Si hay error, revierte todo
✅ **Reporte detallado** - Sabes exactamente qué falló
✅ **Cancelación clara** - Si hay errores, no importa nada

---

## 💡 Ejemplo Completo

### 1. CSV correcto

```csv
codigo_vendedor;nombre;0300 - 1000-CAFES;1201 - 1000-GALLETAS;fecha_inicio;fecha_fin
0150;De La Cruz Meza;38090263;7155926;2026-03-01;2026-03-31
0173;Yama Marcillo;10500026;6886753;2026-03-01;2026-03-31
```

### 2. Validar

```bash
curl -X POST http://localhost:3000/cuota-categoria-import/validar \
  -F "archivo=@cuotas.csv" \
  -F "mesAnio=2026-03"
```

Respuesta:
```json
{
  "success": true,
  "validacion": {
    "esValido": true,
    "vendedoresValidos": 2,
    "categoriasValidas": 2,
    "vendedoresNoEncontrados": [],
    "categoriasNoEncontradas": []
  }
}
```

### 3. Importar

```bash
curl -X POST http://localhost:3000/cuota-categoria-import/cargar \
  -F "archivo=@cuotas.csv" \
  -F "mesAnio=2026-03"
```

Respuesta:
```json
{
  "exitosa": true,
  "procesadas": 4,
  "actualizadas": 4,
  "mensaje": "Se importaron 4 cuotas exitosamente"
}
```

---

## 📞 Necesitas Ayuda?

```bash
# Ver documentación completa
curl http://localhost:3000/cuota-categoria-import/

# Validar archivo
curl -X POST http://localhost:3000/cuota-categoria-import/validar \
  -F "archivo=@cuotas.csv" \
  -F "mesAnio=2026-03"

# Ver cuotas actuales en BD
curl http://localhost:3000/cuota-categoria-import/actuales
```
