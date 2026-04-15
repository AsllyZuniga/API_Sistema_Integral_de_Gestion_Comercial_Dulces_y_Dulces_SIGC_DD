# 🎯 RESUMEN: 3 FORMAS DE IMPORTAR

## ¿Cuál usar en cada caso?

```
┌─────────────────────────────────────────────────────────────┐
│ DESARROLLO / TESTING (Con consola)                          │
├─────────────────────────────────────────────────────────────┤
│ $ node scripts/validarTSV.js ./ventastest.txt               │
│ $ node scripts/importarVentas.js ./ventastest.txt           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ POSTMAN / FRONTEND (Upload de archivo) ⭐ RECOMENDADO       │
├─────────────────────────────────────────────────────────────┤
│ POST http://localhost:3000/import/ventas/upload             │
│ Body: form-data                                             │
│   - archivo: [archivo TSV]                                  │
│   - batchSize: 100 (opcional)                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ API CON RUTA (Para Node.js / Backend)                       │
├─────────────────────────────────────────────────────────────┤
│ POST http://localhost:3000/import/ventas                    │
│ Body: JSON                                                  │
│   {                                                         │
│     "rutaArchivo": "/ruta/absoluta/archivo.txt"            │
│     "batchSize": 100                                        │
│   }                                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 📱 Desde Postman (Frontend/Testing)

### ✅ FORMA 1: Upload de Archivo (LA MÁS FÁCIL)

Esto es lo que vas a usar **en producción desde tu frontend**:

```
1. Abre Postman
2. New → Request POST
3. URL: http://localhost:3000/import/ventas/upload
4. Body → form-data
5. Agrega:
   - Key: "archivo" → Type: File → Selecciona tu .txt
   - Key: "batchSize" → Type: Text → Escribe: 100
6. SEND ↵
```

**Respuesta:**

```json
{
  "mensaje": "Importación completada exitosamente",
  "registrosExitosos": 216,
  "registrosConError": 0,
  "tiempoTotalSegundos": "8.34"
}
```

---

## 🛠️ Paso a Paso Visual para Postman

### Pantalla 1: Nueva Request

```
[ + ]  [GET] ▼  http://localhost:3000/import/ventas/upload
```

### Pantalla 2: Seleccionar Body

```
[ ] Authorization  [ ] Headers  [✓] Body  [ ] Tests
```

### Pantalla 3: form-data

```
[✓] form-data
[✓] x-www-form-urlencoded
[ ] raw
[ ] binary
```

### Pantalla 4: Agregar Campos

```
KEY          TYPE    VALUE
─────────────────────────────────────────
archivo      File    [Browse] ventastest.txt ✓
batchSize    Text    100
```

### Pantalla 5: SEND

```
[SEND] ← Click aquí
```

### Pantalla 6: Ver Respuesta

```
Status: 200 OK ✓

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

## 🔧 Configuración Previa

### Paso 1: Instalar multer

```bash
npm install multer
```

### Paso 2: Verificar app.js tenga estas líneas:

```javascript
const importRouter = require("./routes/importRouter");
app.use("/import", importRouter);
```

### Paso 3: Crear carpeta uploads (si no existe)

```bash
mkdir -p uploads
```

### Paso 4: Iniciar servidor

```bash
npm start
```

### Paso 5: Verificar que funciona

```bash
curl http://localhost:3000/import/status
```

Debe responder:

```json
{
  "estado": "operacional",
  "bd": "conectada",
  "servicio": "importador de ventas disponible"
}
```

---

## ✨ Lo que hace cada Endpoint

| Endpoint                | Método | Qué hace                            | Cuándo              |
| ----------------------- | ------ | ----------------------------------- | ------------------- |
| `/import/status`        | GET    | Verifica si servicio está corriendo | Antes de importar   |
| `/import/ventas/upload` | POST   | Carga archivo y lo procesa          | Frontend/Postman ⭐ |
| `/import/ventas`        | POST   | Procesa archivo de ruta en servidor | Backend/Node.js     |

---

## 💡 Flujo Completo (Postman)

```
1. Verificar estado
   GET /import/status
   ↓ 200 OK ✓

2. Subir archivo
   POST /import/ventas/upload
   - Form-data con archivo
   ↓ 200 OK + estadísticas

3. Verificar en BD
   SELECT COUNT(*) FROM venta;
   ↓ 216 ✓
```

---

## 🎯 Más Importante

**Para Postman/Frontend:**

- ✅ Usar: `/import/ventas/upload`
- ✅ Tipo: `multipart/form-data`
- ✅ El servidor guarda temporalmente
- ✅ Procesa
- ✅ Elimina archivo

**Para Node.js/Scripts:**

- ✅ Usar: `node scripts/importarVentas.js`
- ✅ O endpoint: `/import/ventas` con JSON

---

## 🎬 Prueba Rápido Ahora

### Terminal 1: Iniciar servidor

```bash
npm start
```

### Terminal 2 (o Postman):

```bash
# Verificar que funciona
curl http://localhost:3000/import/status
```

Si ves:

```json
{"estado":"operacional","bd":"conectada",...}
```

✅ **¡Listo! Usa Postman para subir tu archivo.**

---

## 📖 Documentación Completa

Para más detalles, mira:

- `POSTMAN_GUIDE.md` - Guía completa de Postman
- `IMPORTADOR_README.md` - Documentación técnica
- `GUIA_RAPIDA_IMPORT.md` - Guía CLI

---

## ¿Preguntas?

Si algo no funciona:

1. Verifica que el servidor está corriendo (`npm start`)
2. Verifica que multer está instalado (`npm install multer`)
3. Prueba el status endpoint (`GET /import/status`)
4. Revisa los logs en consola

**¡Ya podés importar desde Postman! 🚀**
