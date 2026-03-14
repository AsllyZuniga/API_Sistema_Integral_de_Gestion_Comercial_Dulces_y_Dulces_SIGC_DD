# 🚀 Guía Rápida de Inicio - Importador de Ventas

## 1️⃣ Antes de Empezar

✅ Asegúrate de:

- Tener Node.js instalado (`node --version`)
- Tener la conexión a NeonDB configurada en `.env`
- Que las migraciones estén ejecutadas (`npm run migrate`)
- Que el archivo `ventastest.txt` esté en la raíz del proyecto

## 2️⃣ Ejecución Rápida

### Opción A: CLI (Más fácil para testing)

```bash
# En la carpeta raíz del proyecto
node scripts/importarVentas.js ./ventastest.txt
```

Deberías ver algo como:

```
╔════════════════════════════════════════════════════════╗
║    IMPORTADOR MASIVO DE VENTAS - DULCES Y DULCES      ║
╚════════════════════════════════════════════════════════╝

ℹ️  Archivo: /ruta/completa/ventastest.txt
ℹ️  Tamaño de batch: 100
⚠️  Este proceso puede tomar varios minutos para archivos grandes

ℹ️  Conectando a la base de datos...
✅ Conexión a BD establecida

🔄 Iniciando importación de ventas...
📁 Archivo: /ruta/completa/ventastest.txt
⚙️ Tamaño de batch: 100
✅ Encabezados detectados: 38 columnas
📊 Procesadas 16 filas...

╔════════════════════════════════════════════════════════╗
║        RESUMEN DE IMPORTACIÓN                          ║
╚════════════════════════════════════════════════════════╝
✅ Exitosas: 16
❌ Errores: 0
⏱️  Tiempo total: 5.23s
⚡ Velocidad: 3.06 registros/segundo
```

### Opción B: Desde Node.js

```bash
# En la consola de Node
node -e "
const models = require('./models');
const ImportadorVentas = require('./services/importventas');

(async () => {
  const importador = new ImportadorVentas(models.sequelize, models);
  await importador.importar('./ventastest.txt');
  process.exit(0);
})();
"
```

### Opción C: API REST (Si tienes el servidor corriendo)

```bash
# Terminal 1: Inicia el servidor
npm start

# Terminal 2: Ejecuta la importación
curl -X POST http://localhost:3000/import/ventas \
  -H "Content-Type: application/json" \
  -d '{"rutaArchivo": "'$(pwd)'/ventastest.txt"}'
```

## 3️⃣ Verificar Resultados

### En PostgreSQL/NeonDB

```sql
-- Ver cuántas ventas se importaron
SELECT COUNT(*) as total_ventas FROM venta;

-- Ver detalles de ventas
SELECT id_venta, numero_documento, fecha, valor_neto
FROM venta
ORDER BY id_venta DESC
LIMIT 5;

-- Ver detalles de las ventas
SELECT * FROM detalle_venta LIMIT 5;

-- Verificar proveedores creados
SELECT * FROM proveedor LIMIT 5;

-- Verificar clientes creados
SELECT * FROM cliente LIMIT 5;
```

### En Node.js

```javascript
const models = require("./models");

(async () => {
  const ventas = await models.venta.findAll({
    include: [
      { model: models.cliente },
      { model: models.vendedor },
      { model: models.detalle_venta },
    ],
    limit: 5,
  });

  console.log(JSON.stringify(ventas, null, 2));
  process.exit(0);
})();
```

## 4️⃣ Problemas Comunes

### ❌ "Archivo no encontrado"

```bash
# Asegúrate de usar la ruta correcta
ls -la ventastest.txt  # ¿Existe?

# Usa ruta absoluta si es necesario
node scripts/importarVentas.js /home/usuario/documentos/ventastest.txt
```

### ❌ "Error: connect ECONNREFUSED"

```bash
# Verifica que NeonDB está disponible
# Revisa tu .env
cat .env | grep DATABASE_URL

# Prueba la conexión
npm run test-db
```

### ❌ "Sequelize Error: Column 'X' does not exist"

```bash
# Ejecuta las migraciones
npm run migrate

# Si necesitas reset (¡CUIDADO! Borra datos)
npm run migrate:reset
```

### ⚠️ Proceso muy lento

```bash
# Reduce el tamaño del batch
node scripts/importarVentas.js ./ventastest.txt --batch=50

# O crea el archivo en partes y importa por separado
node scripts/importarVentas.js ./ventas_parte1.txt
node scripts/importarVentas.js ./ventas_parte2.txt
```

## 5️⃣ Integración en el app.js

Para usar la API REST, agrega esto a tu `app.js`:

```javascript
// ... otros requires
const importRouter = require("./routes/importRouter");

app.use("/import", importRouter);

// Resto del código...
```

Luego podrás usar:

```bash
curl http://localhost:3000/import/status  # Verificar estado
curl -X POST http://localhost:3000/import/ventas -d '{"rutaArchivo":"..."}'
```

## 6️⃣ Explicación del Mapeo (Resumen)

- **LINEA** → Proveedor
- **CATEGORIA + MEGACATEGORIA + SUBCATEGORIA** → Relación jerárquica
- **Cliente factura (NIT)** → ID del cliente
- **Nro documento** → Número de la factura/comprobante
- **Item** → Producto
- **Valor subtotal** → El valor MÁS importante, se guarda en detalle_venta.subtotal
- **Cantidad** y **Cantidad emp.** → Cantidad pedida vs cantidad en empaque
- **Fecha** → Fecha de la venta

## 7️⃣ Próximas Ejecuciones

Una vez hayas confirmado que funciona:

### Para archivos grandes (500MB+)

```bash
# Procesar en chunks más pequeños
node scripts/importarVentas.js ./ventas_grande.txt --batch=50
```

### Para importación programada

```bash
# Ejecuta en horario de bajo uso
node scripts/importarVentas.js ./ventas.txt &

# O con cron en Linux:
# 0 2 * * * cd /ruta/proyecto && node scripts/importarVentas.js ./ventas.txt
```

### Monitor de Cuota

```bash
# Verifica el uso de tu base de datos
# En el dashboard de NeonDB
```

---

## ✅ Checklist Antes de Importar Datos Reales

- [ ] Backup de BD realizado
- [ ] Archivo TSV validado (abierto en Excel/editor)
- [ ] Ejecutado con archivo de prueba exitosamente
- [ ] Verificado que NUMBER_DOCUMENTO no está duplicado
- [ ] Horario de bajo uso del sistema
- [ ] Monitor de cuota NeonDB disponible
- [ ] Comando CLI probado localmente

## 🎉 ¡Listo!

Ya puedes importar tus datos de prueba. Una vez confirmes que todo funciona, podrás escalar a archivos más grandes.

**¿Preguntas?** Revisa el `IMPORTADOR_README.md` para documentación completa.
