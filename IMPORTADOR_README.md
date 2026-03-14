# 📊 Importador Masivo de Ventas

Sistema de importación de datos de ventas desde archivos TSV (Tab-Separated Values) a la base de datos NeonDB.

## 🎯 Características

- ✅ **Procesamiento en batches** - Optimizado para archivos de 800MB+
- ✅ **Sin cálculos** - Solo volcado directo de datos
- ✅ **Manejo de relaciones** - Crea/busca registros relacionados automáticamente
- ✅ **Control de cuota** - Diseñado para NeonDB serverless
- ✅ **Reporte detallado** - Estadísticas completas de importación
- ✅ **Recuperación de errores** - Continúa procesando incluso con errores

## 📋 Mapeo de Columnas

| Columna TSV                     | Tabla Destino | Campo                  |
| ------------------------------- | ------------- | ---------------------- |
| LINEA                           | proveedor     | nombre                 |
| CATEGORIA                       | categoria     | nombre                 |
| MEGACATEGORIA                   | megacategoria | nombre                 |
| SUBCATEGORIA                    | subcategoria  | nombre                 |
| CANAL                           | canal         | nombre                 |
| SUBCANAL                        | subcanal      | nombre                 |
| Codigo vendedor                 | vendedor      | codigo_vendedor        |
| Nombre vendedor                 | vendedor      | nombre                 |
| Nro documento                   | venta         | numero_documento       |
| Cliente factura                 | cliente       | nro_documento          |
| Razon social cliente factura    | cliente       | razon_social           |
| Direccion 1                     | cliente       | direccion              |
| Sucursal factura                | cliente       | sucursal               |
| Nombre establecimiento facturar | cliente       | nombre_establecimiento |
| Desc. ciudad                    | ciudad        | nombre                 |
| Barrio                          | barrio        | nombre                 |
| TIPO DE NEGOCIO                 | tipo_negocio  | tipo_negocio           |
| DETALLE TIPO DE NEGOCIO         | cliente       | nombre_establecimiento |
| Item                            | item          | codigo_item            |
| Desc. item                      | item          | descripcion            |
| U.M. Orden                      | item          | unidad_medida_orden    |
| Factor U.M. emp.                | item          | factor_um_empaque      |
| Factor U.M. Orden               | item          | factor_um_orden        |
| Peso en KILO                    | item          | peso_kilo              |
| Cantidad emp.                   | detalle_venta | cantidad_emp           |
| Cantidad                        | detalle_venta | cantidad               |
| Costo promedio total            | detalle_venta | precio_unitario        |
| Valor descuentos                | detalle_venta | descuento              |
| **Valor subtotal**              | detalle_venta | subtotal               |
| Valor impuestos                 | venta         | valor_impuestos        |
| Valor neto                      | venta         | valor_neto             |
| Margen promedio                 | venta         | margen_promedio        |
| Cond. pago fact                 | venta         | condicion_pago         |
| Fecha                           | venta         | fecha                  |

## 🚀 Cómo Usar

### Opción 1: Script CLI (Recomendado para archivos grandes)

```bash
# Uso básico
node scripts/importarVentas.js ./ventastest.txt

# Con opciones
node scripts/importarVentas.js ./ventas.txt --batch=50 --verbose

# Especificar tamaño de batch (para optimizar según tu BD)
node scripts/importarVentas.js /ruta/archivo.txt --batch=100

# Salida detallada (para debugging)
node scripts/importarVentas.js ./ventas.txt --verbose
```

#### Opciones CLI:

- `--batch=N` - Tamaño del batch (default: 100). Valores recomendados:
  - 50: Para conexiones lentas o BD muy cargada
  - 100: Para la mayoría de casos
  - 200: Para conexiones rápidas
- `--verbose` - Mostrar salida detallada
- `--archivo=RUTA` - Especificar ruta alternativa

### Opción 2: API REST

```bash
curl -X POST http://localhost:3000/import/ventas \
  -H "Content-Type: application/json" \
  -d '{
    "rutaArchivo": "/ruta/completa/al/archivo/ventas.txt"
  }'
```

**Respuesta exitosa:**

```json
{
  "mensaje": "Importación completada",
  "estadisticas": {
    "registrosExitosos": 1000,
    "registrosConError": 5,
    "tiempoTotalSegundos": 45.23,
    "velocidadRegistrosPorSegundo": "22.08"
  }
}
```

**Verificar estado:**

```bash
curl http://localhost:3000/import/status
```

### Opción 3: Por código Node.js

```javascript
const ImportadorVentas = require("./services/importventas");
const models = require("./models");

const importador = new ImportadorVentas(models.sequelize, models);

// Personalizar tamaño de batch
importador.batchSize = 150;

const estadisticas = await importador.importar("./ventastest.txt");
console.log(estadisticas);
```

## ⚙️ Configuración Recomendada

### Para archivos de 100-500 MB

```bash
node scripts/importarVentas.js ./ventas.txt --batch=100
```

### Para archivos de 500-800 MB

```bash
node scripts/importarVentas.js ./ventas.txt --batch=75
```

### Para archivos > 800 MB (múltiples ejecuciones)

```bash
# Dividir archivo en partes y procesar por separado
node scripts/importarVentas.js ./ventas_parte1.txt --batch=50
node scripts/importarVentas.js ./ventas_parte2.txt --batch=50
node scripts/importarVentas.js ./ventas_parte3.txt --batch=50
```

## 📊 Resumen de Ejecución

Después de completar, recibirás:

```
✅ Registros exitosos: 15420
❌ Registros con error: 12
⏱️  Tiempo total: 125.45s
⚡ Velocidad: 122.86 registros/segundo
```

## ⚠️ Notas Importantes

1. **No calcula nada** - Solo traslada los datos como están en el archivo
2. **Valor subtotal es el más importante** - Es el valor que se guarda en detalle_venta.subtotal
3. **Crea registros relacionados automáticamente** - Si un proveedor, cliente o item no existe, los crea
4. **Manejo de duplicados** - Busca por nombre/código y reutiliza si existen
5. **Normalización de números** - Convierte formato de moneda colombiana ($123.456,78) a decimal
6. **Encoding UTF-8** - El archivo debe estar en UTF-8

## 🔧 Troubleshooting

### Error: "Archivo no encontrado"

```bash
# Usar ruta absoluta
node scripts/importarVentas.js /home/usuario/mitad1.txt
```

### Error de conexión a BD

```bash
# Verificar variables de entorno
echo $DATABASE_URL

# Verificar archivo .env
cat .env
```

### Velocidad muy lenta

```bash
# Reducir tamaño de batch
node scripts/importarVentas.js ./ventas.txt --batch=30
```

### Muchos registros con error

```bash
# Ejecutar con verbose para ver detalles
node scripts/importarVentas.js ./ventas.txt --verbose --batch=10
```

## 📈 Monitoreo

El importador registra progreso cada lote procesado:

```
📊 Procesadas 100 filas...
📊 Procesadas 200 filas...
📊 Procesadas 300 filas...
```

## 🛑 Cancelar Importación

Para cancelar una importación en progreso:

- **Ctrl+C** en terminal - Detiene el script (perderás los cambios del último batch)
- **Conexión interrumpida** - La importación se detiene automáticamente

## 💡 Consejos

1. **Backup antes de importar** - Siempre haz backup de tu BD
2. **Procesar con transacciones** - Cada batch es una transacción independiente
3. **Validar archivo primero** - Asegúrate de que el TSV está bien formado
4. **Usar horario de bajo uso** - Para no afectar usuarios activos
5. **Monitorear cuota de NeonDB** - El script está optimizado pero vigila el uso

## 📝 Formato del Archivo TSV

El archivo debe:

- Estar separado por TABULACIONES (Tab character)
- Primera línea con encabezados
- Encoding UTF-8
- Valores de moneda en formato: `$1.234,56`
- Fechas en formato: `DD/MM/YYYY`

## 🐛 Reporte de Errores

Si encuentras errores durante la importación:

1. Ejecuta con `--verbose` para más detalles
2. Guarda el output de la consola
3. Verifica los logs en la BD
4. Revisa el archivo TSV en esas líneas

## 📞 Soporte

Para problemas:

1. Revisar el archivo TSV es correcto
2. Verificar conexión a BD
3. Reducir batch size
4. Contactar al equipo de desarrollo con logs
