# Importador de Cuotas por Categoría

Este módulo permite cargar cuotas de categoría desde un archivo CSV de Nestlé y actualizar automáticamente la tabla `categoria` con los `id_cuota_categoria` correspondientes.

## 📋 Archivos creados

- `services/cuotaCategoriaImportService.js` - Servicio de importación
- `controllers/cuotaCategoriaImportController.js` - Controlador de API
- `routes/cuotaCategoriaImportRouter.js` - Rutas
- `scripts/importarCuotasCategoria.js` - Script de línea de comandos

## 🚀 Formas de usar

### 1. Via API REST

**POST** `/cuota-categoria-import/importar/nestle`

Body (JSON):
```json
{
  "rutaArchivo": "./cuotas nestle - Hoja1.csv",
  "fechaInicio": "2026-03-01",
  "fechaFin": "2026-03-31"
}
```

Ejemplo con curl:
```bash
curl -X POST http://localhost:3000/cuota-categoria-import/importar/nestle \
  -H "Content-Type: application/json" \
  -d '{
    "rutaArchivo": "./cuotas nestle - Hoja1.csv",
    "fechaInicio": "2026-03-01",
    "fechaFin": "2026-03-31"
  }'
```

**GET** `/cuota-categoria-import/actuales`

Devuelve todas las cuotas de categoría actualmente cargadas.

### 2. Via línea de comandos

```bash
# Uso básico (fechas default)
node scripts/importarCuotasCategoria.js "./cuotas nestle - Hoja1.csv"

# Con fechas específicas
node scripts/importarCuotasCategoria.js "./cuotas nestle - Hoja1.csv" "2026-03-01" "2026-03-31"

# Desde cualquier directorio (con ruta absoluta)
node scripts/importarCuotasCategoria.js "/media/felipe-rivas/Datos/.../cuotas nestle - Hoja1.csv"
```

## 📊 Formato esperado del CSV

El CSV debe tener:
- Primera columna: `Codigo Vendedor`
- Segunda columna: `Nombre de vendedor`
- Columnas siguientes: Códigos de categoría con formato `XXXX - DESCRIPCION`
- Valores: Montos de cuota por vendedor

Ejemplo:
```csv
Codigo Vendedor,Nombre de vendedor,0300 - 1000-CAFES,1201 - 1000-GALLETAS,2950 - 2500-CHOCOLATES
0150,De La Cruz Meza,30846156,6407100,50000
0173,Yama Marcillo,10500026,6886753,204848
```

## 🔄 Procesos

1. **Lee el CSV** y detecta automáticamente las categorías
2. **Suma las cuotas** de todos los vendedores por categoría
3. **Busca cada categoría** en la BD por nombre
4. **Crea registros** en `cuotaCategoria` (si no existen)
5. **Actualiza la tabla `categoria`** con el `id_cuota_categoria`

## ✅ Respuesta exitosa

```json
{
  "exitosa": true,
  "procesadas": 150,
  "actualizadas": 150,
  "errores": [],
  "mensaje": "Se cargaron 150 cuotas de categoría exitosamente"
}
```

## ❌ Errores comunes

| Error | Causa | Solución |
|-------|-------|----------|
| "Archivo no encontrado" | Ruta del CSV incorrecta | Verificar que el archivo existe |
| "Categoría no encontrada" | La categoría no existe en BD | Importar datos de categoría primero |
| "Archivo CSV vacío" | El CSV está vacío | Verificar contenido del archivo |

## 🔍 Verificación de datos

Consultar cuotas cargadas:
```bash
curl http://localhost:3000/cuota-categoria-import/actuales
```

O en BD:
```sql
SELECT c.nombre, cc.cuota, cc.fecha_inicio, cc.fecha_fin
FROM categoria c
LEFT JOIN "cuotaCategoria" cc ON cc.id_cuota_categoria = c.id_cuota_categoria
WHERE cc.id_cuota_categoria IS NOT NULL
ORDER BY c.nombre;
```

## 📅 Período de cuotas

El servicio permite especificar diferentes períodos:
- Default: 2026-03-01 a 2026-03-31
- Personalizado: Pasar `fechaInicio` y `fechaFin` en formato YYYY-MM-DD

## 🎯 Notas importantes

- Las cuotas se **suman** de todos los vendedores en el CSV
- Solo se importan categorías que **existen en la BD**
- El sistema es **idempotente**: ejecutar 2 veces no duplica datos
- Las fechas de cuota aplican a toda la categoría (no por vendedor)
