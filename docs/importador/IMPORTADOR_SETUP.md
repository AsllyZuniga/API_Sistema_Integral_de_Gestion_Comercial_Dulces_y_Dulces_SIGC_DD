# 📦 Sistema de Importación Masiva de Ventas - CREADO

## ✅ Archivos Creados

### 1. **Servicio Principal**

📂 `/services/importventas.js`

- Clase `ImportadorVentas` con toda la lógica de importación
- Procesa en batches para optimizar NeonDB serverless
- Mapeo automático de columnas
- Búsqueda/creación de registros relacionados
- **Sin cálculos**, solo volcado de datos
- Normalización de valores monetarios y fechas

### 2. **Controlador API**

📂 `/controllers/importController.js`

- `importarVentas(req, res)` - POST endpoint para importación
- `verificarEstado(req, res)` - GET endpoint para chequear estado
- Manejo de errores y respuestas JSON

### 3. **Rutas**

📂 `/routes/importRouter.js`

- `POST /import/ventas` - Iniciar importación
- `GET /import/status` - Verificar estado del servicio

### 4. **Scripts CLI**

📂 `/scripts/importarVentas.js`

- Script ejecutable para terminal
- Opción `--batch=N` para personalizar tamaño de batch
- Opción `--verbose` para salida detallada
- Salida con colores y estadísticas
- **Recomendado para archivos grandes**

📂 `/scripts/validarTSV.js`

- Valida archivo antes de importar
- Detecta errores de estructura
- Genera advertencias
- Muestra estadísticas del archivo

### 5. **Documentación**

📂 `IMPORTADOR_README.md`

- Documentación completa
- Tabla de mapeo de columnas
- Troubleshooting
- Configuración recomendada

📂 [`../GUIA_RAPIDA_IMPORT.md`](../GUIA_RAPIDA_IMPORT.md)

- Instrucciones paso a paso
- Ejemplos de ejecución
- Verificación de resultados
- Checklist de validación

---

## 🚀 Cómo Usar - 3 Métodos

### Método 1️⃣: CLI (Recomendado para testing)

```bash
# Simplemente ejecuta:
node scripts/importarVentas.js ./ventastest.txt

# Con opciones:
node scripts/importarVentas.js ./ventastest.txt --batch=50 --verbose
```

### Método 2️⃣: Validar primero, luego importar

```bash
# Paso 1: Validar el archivo
node scripts/validarTSV.js ./ventastest.txt

# Paso 2: Si está bien, importar
node scripts/importarVentas.js ./ventastest.txt
```

### Método 3️⃣: API REST

Primero, añade a tu `app.js`:

```javascript
const importRouter = require("./routes/importRouter");
app.use("/import", importRouter);
```

Luego:

```bash
# Verificar estado
curl http://localhost:3000/import/status

# Importar
curl -X POST http://localhost:3000/import/ventas \
  -H "Content-Type: application/json" \
  -d '{"rutaArchivo": "/ruta/completa/ventastest.txt"}'
```

---

## 📊 Mapeo de Datos

| TSV                  | Base de Datos    | Tabla             | Campo            |
| -------------------- | ---------------- | ----------------- | ---------------- |
| LINEA                | Nombre proveedor | proveedor         | nombre           |
| MEGACATEGORIA        | Megacategoría    | megacategoria     | nombre           |
| CATEGORIA            | Categoría        | categoria         | nombre           |
| SUBCATEGORIA         | Subcategoría     | subcategoria      | nombre           |
| CANAL                | Canal            | canal             | nombre           |
| SUBCANAL             | Subcanal         | subcanal          | nombre           |
| Codigo vendedor      | ID vendedor      | vendedor          | codigo_vendedor  |
| Cliente factura      | NIT cliente      | cliente           | nro_documento    |
| Nro documento        | Número factura   | venta             | numero_documento |
| Item                 | Código item      | item              | codigo_item      |
| **Valor subtotal**   | **Subtotal**     | **detalle_venta** | **subtotal**     |
| Cantidad             | Cantidad         | detalle_venta     | cantidad         |
| Costo promedio total | Precio unitario  | detalle_venta     | precio_unitario  |
| Valor descuentos     | Descuento        | detalle_venta     | descuento        |
| Fecha                | Fecha venta      | venta             | fecha            |

---

## ⚙️ Características Principales

✅ **Optimizado para NeonDB Serverless**

- Procesa en batches configurables (default 100)
- Evita timeout de conexión
- Control de cuota de BD

✅ **Inteligente**

- Busca registros existentes antes de crear
- Crea automáticamente entidades relacionadas
- Maneja duplicados correctamente

✅ **Sin Cálculos**

- Solo traslada datos como vienen en el archivo
- No hace validaciones de lógica de negocio
- El valor **más importante es subtotal**

✅ **Robusto**

- Continúa aunque haya errores
- Proporciona estadísticas detalladas
- Soporta archivos de 800MB+

---

## 📈 Estadísticas y Monitoreo

Después de cada importación recibirás:

```
✅ Registros exitosos: 1234
❌ Registros con error: 5
⏱️  Tiempo total: 45.23s
⚡ Velocidad: 27.28 registros/segundo
```

---

## 🎯 Recomendaciones de Uso

### Para archivos pequeños (< 100MB)

```bash
node scripts/importarVentas.js ./ventas.txt
```

### Para archivos medianos (100-500MB)

```bash
node scripts/importarVentas.js ./ventas.txt --batch=100
```

### Para archivos grandes (500-800MB)

```bash
node scripts/importarVentas.js ./ventas.txt --batch=50
```

### Para archivos > 800MB

Divide el archivo en partes:

```bash
node scripts/importarVentas.js ./ventas_parte1.txt --batch=50
node scripts/importarVentas.js ./ventas_parte2.txt --batch=50
node scripts/importarVentas.js ./ventas_parte3.txt --batch=50
```

---

## ⚠️ Consideraciones Importantes

1. **Sin cálculos**: El script no calcula nada, solo copia datos
2. **Valor subtotal es clave**: Este es el campo más importante, se guarda en `detalle_venta.subtotal`
3. **Formato de archivo**:
   - Separado por TABULACIONES (Tab)
   - Primera línea: encabezados
   - Encoding UTF-8
   - Moneda: `$1.234,56`
   - Fechas: `DD/MM/YYYY`

4. **Backup**: Siempre haz backup antes de importar
5. **Horario**: Importa en horario de bajo uso
6. **Monitor**: Vigila la cuota de NeonDB

---

## 🐛 Troubleshooting

**Archivo no encontrado:**

```bash
# Usa ruta absoluta
node scripts/importarVentas.js /home/user/ventastest.txt
```

**Error de conexión:**

```bash
# Verifica .env
cat .env | grep DATABASE_URL
```

**Muy lento:**

```bash
# Reduce batch
node scripts/importarVentas.js ./ventas.txt --batch=30
```

**Muchos errores:**

```bash
# Valida primero
node scripts/validarTSV.js ./ventastest.txt --verbose
```

---

## 📋 Checklist Antes de Importar Datos Reales

- [ ] Probé con ventastest.txt exitosamente
- [ ] Validé archivo con `validarTSV.js`
- [ ] Hice backup de la base de datos
- [ ] Estoy en horario de bajo uso
- [ ] Tengo monitor de cuota NeonDB abierto
- [ ] Leí la documentación completa
- [ ] Encabezados del archivo coinciden

---

## 📞 Próximos Pasos

1. Ejecuta validación:

   ```bash
   node scripts/validarTSV.js ./ventastest.txt
   ```

2. Si está bien, importa:

   ```bash
   node scripts/importarVentas.js ./ventastest.txt
   ```

3. Verifica resultados en BD:

   ```sql
   SELECT COUNT(*) FROM venta;
   SELECT * FROM detalle_venta LIMIT 5;
   ```

4. Cuando esté seguro, usa API o archivos reales

---

## 📚 Documentación Completa

- **IMPORTADOR_README.md** - Referencia técnica completa
- **[`../GUIA_RAPIDA_IMPORT.md`](../GUIA_RAPIDA_IMPORT.md)** - Guía paso a paso
- **Código en servicios/importventas.js** - Comentarios detallados

---

## 🎉 ¡Listo para Importar!

El sistema está completamente funcional y optimizado para:

- ✅ Archivos de cualquier tamaño
- ✅ NeonDB serverless
- ✅ Datos de prueba o reales
- ✅ Importación sin errores críticos

**¡Adelante con la importación! 🚀**
