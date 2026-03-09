# 📮 Guía Postman - Importación de Ventas con Upload

## 🚀 Configuración Inicial

### 1. Instalar multer (si no está instalado)

```bash
npm install multer
```

### 2. Agregar middleware en app.js

```javascript
const importRouter = require("./routes/importRouter");
app.use("/import", importRouter);
```

### 3. Iniciar servidor

```bash
npm start
```

---

## 📨 Endpoint 1: Upload de Archivo (RECOMENDADO PARA FRONTEND)

**Método:** `POST`  
**URL:** `http://localhost:3000/import/ventas/upload`  
**Tipo:** `form-data`

### Pasos en Postman:

1. **Crear nueva Request:**
   - Tipo: `POST`
   - URL: `http://localhost:3000/import/ventas/upload`

2. **Ir a pestaña "Body":**
   - Seleccionar `form-data`

3. **Agregar parámetros:**
   - **Campo:** `archivo`
     - **Type:** `File`
     - **Valor:** Seleccionar tu archivo `ventastest.txt`
   - **Campo:** `batchSize` (opcional)
     - **Type:** `Text`
     - **Valor:** `100`

4. **Headers (automáticos):**
   Postman lo configura automáticamente con `multipart/form-data`

5. **Enviar:** Click en "Send"

### Respuesta Exitosa (200):

```json
{
  "mensaje": "Importación completada exitosamente",
  "archivo": "ventastest.txt",
  "tamano_mb": 1.25,
  "estadisticas": {
    "registrosExitosos": 216,
    "registrosConError": 0,
    "tiempoTotalSegundos": "8.34",
    "velocidadRegistrosPorSegundo": "25.90"
  }
}
```

---

## 📝 Endpoint 2: Importar desde Ruta en Servidor

**Método:** `POST`  
**URL:** `http://localhost:3000/import/ventas`  
**Tipo:** `application/json`

### Pasos en Postman:

1. **Crear nueva Request:**
   - Tipo: `POST`
   - URL: `http://localhost:3000/import/ventas`

2. **Ir a pestaña "Body":**
   - Seleccionar `raw`
   - Cambiar de texto a `JSON`

3. **Agregar JSON:**

```json
{
  "rutaArchivo": "/ruta/completa/al/archivo/ventastest.txt",
  "batchSize": 100
}
```

4. **Headers:**
   - `Content-Type: application/json`

5. **Enviar:** Click en "Send"

### Respuesta Exitosa (200):

```json
{
  "mensaje": "Importación completada",
  "archivo": "/ruta/completa/al/archivo/ventastest.txt",
  "estadisticas": {
    "registrosExitosos": 216,
    "registrosConError": 0,
    "tiempoTotalSegundos": "8.34",
    "velocidadRegistrosPorSegundo": "25.90"
  }
}
```

---

## ✅ Endpoint 3: Verificar Estado

**Método:** `GET`  
**URL:** `http://localhost:3000/import/status`

### Pasos en Postman:

1. **Crear nueva Request:**
   - Tipo: `GET`
   - URL: `http://localhost:3000/import/status`

2. **Enviar:** Click en "Send"

### Respuesta Exitosa (200):

```json
{
  "estado": "operacional",
  "bd": "conectada",
  "servicio": "importador de ventas disponible"
}
```

---

## 🎯 Comparación: Upload vs Ruta

| Aspecto            | Upload de Archivo       | Ruta en Servidor   |
| ------------------ | ----------------------- | ------------------ |
| **Cuándo usar**    | Frontend/Postman        | Node.js scripts    |
| **Tamaño archivo** | Hasta 1GB               | Sin límite         |
| **Tipo de datos**  | `multipart/form-data`   | `application/json` |
| **Endpoint**       | `/import/ventas/upload` | `/import/ventas`   |
| **Ideal para**     | Producción              | Desarrollo         |
| **Requiere**       | Seleccionar archivo     | Ruta en servidor   |

---

## 📋 Ejemplos con curl

### Upload de archivo:

```bash
curl -X POST http://localhost:3000/import/ventas/upload \
  -F "archivo=@./ventastest.txt" \
  -F "batchSize=100"
```

### Desde ruta:

```bash
curl -X POST http://localhost:3000/import/ventas \
  -H "Content-Type: application/json" \
  -d '{
    "rutaArchivo": "/home/usuario/ventastest.txt",
    "batchSize": 100
  }'
```

### Verificar estado:

```bash
curl http://localhost:3000/import/status
```

---

## 🔥 Errores Comunes en Postman

### Error 1: "Bad Request - archivo requerido"

**Causa:** No se adjuntó el archivo  
**Solución:** Verificar que en Body aparezca el archivo seleccionado

### Error 2: "Solo se permiten archivos .txt, .tsv o .csv"

**Causa:** Archivo con extensión inválida  
**Solución:** Asegúrese que el archivo es `.txt` o `.tsv`

### Error 3: "File too large"

**Causa:** Archivo mayor a 1GB  
**Solución:** Dividir archivo en partes más pequeñas

### Error 4: "rutaArchivo es requerido"

**Causa:** En JSON, falta el campo rutaArchivo  
**Solución:** Incluir `"rutaArchivo": "..."` en el JSON

### Error 5: "Archivo no encontrado"

**Causa:** La ruta no existe en el servidor  
**Solución:** Verificar que la ruta es correcta y absoluta

---

## 🎬 Demo Paso a Paso (Upload)

**Paso 1:** Abrir Postman

**Paso 2:** Crear request POST

```
http://localhost:3000/import/ventas/upload
```

**Paso 3:** Ir a Body → form-data

**Paso 4:** Agregar archivo

```
Key: archivo
Type: File
Value: [Seleccionar ventastest.txt]
```

**Paso 5:** (Opcional) Agregar batch size

```
Key: batchSize
Type: Text
Value: 100
```

**Paso 6:** Click en "Send"

**Paso 7:** Ver respuesta con estadísticas

---

## 📊 Monitorear Resultado

### En Postman:

- Status debe ser `200 OK`
- `registrosExitosos` debe tener un número > 0
- `registrosConError` idealmente `0`

### En BD:

```sql
SELECT COUNT(*) FROM venta;
SELECT * FROM venta ORDER BY id_venta DESC LIMIT 5;
SELECT * FROM detalle_venta LIMIT 5;
```

---

## 🚨 Notas Importantes

1. **El servidor debe estar corriendo** antes de hacer requests
2. **El archivo debe estar en formato TSV** (Tab-Separated Values)
3. **La BD debe estar conectada** (verificar con `/import/status`)
4. **Archivo se elimina después de procesar** (no queda en servidor)
5. **Máximo 1GB por archivo** (debido a esta configuración)

---

## 💡 Para Producción

### Aumentar límite de tamaño (en importRouter.js):

```javascript
limits: {
  fileSize: 2000 * 1024 * 1024; // 2GB
}
```

### Usar almacenamiento en cloud:

```javascript
// Usar AWS S3, Google Cloud Storage, etc.
const storage = multer.memoryStorage(); // Procesar en memoria
```

### Agregar validación:

```javascript
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Validaciones adicionales
    if (!req.user) {
      return cb(new Error("No autorizado"));
    }
    cb(null, true);
  },
});
```

---

## ✨ Todo Listo

**Ya puedes:**

- ✅ Cargar archivos desde Postman
- ✅ Importar datos a la BD
- ✅ Verificar estado del servicio
- ✅ Usar en producción con frontend

**¿Necesitas ayuda?** Revisa los ejemplos de curl o contacta al equipo.
