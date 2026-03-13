# 🚀 CONFIGURACIÓN PARA ARCHIVOS GRANDES - POSTMAN

## ✅ CONFIGURACIONES YA IMPLEMENTADAS EN EL SERVIDOR

### Backend Express (app.js)

- ✅ **Límite de payload**: 200 MB
- ✅ **Timeout global**: 30 minutos
- ✅ **Headers optimizados**: Keep-alive activado

### Multer (routes/importRouter.js)

- ✅ **Límite Multer**: 1 GB
- ✅ **Tipos permitidos**: .txt, .tsv, .csv

### Controller (controllers/importController.js)

- ✅ **Timeout específico**: 45 minutos para importación
- ✅ **Streaming response**: Updates cada 10 segundos
- ✅ **Keep-alive**: Mantiene conexión activa durante el proceso

---

## ⚙️ CONFIGURAR POSTMAN PARA ARCHIVO DE 100 MB

### 1. Configuración de Timeout

```json
// En Postman Settings → General
{
  "requestTimeout": 3600000, // 1 hora (en milisegundos)
  "responseTimeout": 3600000 // 1 hora
}
```

### 2. Request Type

- **Method**: POST
- **URL**: `http://localhost:3000/import/ventas/upload`
- **Content-Type**: `multipart/form-data` (automático)

### 3. Body Configuration

```
Body → form-data:
┌─────────────┬──────────┬──────────────────┐
│    KEY      │   TYPE   │      VALUE       │
├─────────────┼──────────┼──────────────────┤
│ archivo     │   File   │ [Tu archivo.tsv] │
│ batchSize   │   Text   │ 1000            │
└─────────────┴──────────┴──────────────────┘
```

### 4. Headers Recomendados

```
Connection: keep-alive
Cache-Control: no-cache
```

---

## 📊 MONITOREO DEL PROCESO

### Response Format (Streaming)

El servidor enviará respuestas en tiempo real:

```json
// Inicio
{"status":"iniciando","mensaje":"Procesando archivo ventas_100mb.tsv (98.45 MB)","timestamp":"2026-03-12T..."}

// Cada 10 segundos
{"status":"procesando","mensaje":"Importación en progreso...","timestamp":"2026-03-12T..."}

// Final exitoso
{
  "status": "completado",
  "mensaje": "Importación completada exitosamente",
  "archivo": "ventas_100mb.tsv",
  "tamano_mb": 98.45,
  "estadisticas": {
    "registrosExitosos": 75832,
    "registrosConError": 168,
    "totalRegistros": 76000,
    "tiempoSegundos": "245.67",
    "registrosPorSegundo": "308.72"
  }
}
```

---

## 🛠️ OPTIMIZACIONES IMPLEMENTADAS

### Performance Features

- ✅ **Precarga de maestros**: O(1) lookups en memory
- ✅ **Bulk inserts**: Lotes de 1000 registros
- ✅ **Transacciones**: 5000 registros por transacción
- ✅ **Streaming**: Procesamiento línea por línea
- ✅ **Bypass cache**: Cliente e Item usan create() directo

### Memory Management

- ✅ **Mapas separados**: Cache vs nuevos registros
- ✅ **Cleanup automático**: Archivos temporales eliminados
- ✅ **Error handling**: Rollback en fallos

---

## 🎯 ESTIMACIONES DE RENDIMIENTO

### Archivo 100 MB (~500,000 registros)

- **Tiempo estimado**: 15-25 minutos
- **Velocidad**: ~300-500 registros/segundo
- **Memoria pico**: ~200-400 MB

### Indicadores de Progreso

- Updates cada 10 segundos en Postman
- Logs detallados en consola del servidor
- Estadísticas finales con métricas

---

## 🚨 TROUBLESHOOTING

### Si Postman se cuelga:

1. ✅ Verificar timeout: Settings → General → Request/Response Timeout
2. ✅ Cerrar otras pestañas pesadas en Postman
3. ✅ Usar Postman Desktop (no web version)
4. ✅ Verificar memoria disponible en sistema

### Si el servidor falla:

1. ✅ Monitor logs: `npm start` output
2. ✅ Verificar memoria: `htop` / Task Manager
3. ✅ Comprobar conexión DB: PostgreSQL activo
4. ✅ Revisar espacio en disco

---

## 💡 CONSEJOS FINALES

1. **Usar Postman Desktop** para mejor rendimiento
2. **Formato TSV** bien estructurado (38 columnas)
3. **Cerrar aplicaciones** que consuman memoria
4. **Monitorear logs** durante importación
5. **Backup DB** antes de importaciones grandes

---

### ✨ SISTEMA OPTIMIZADO PARA ESCALA EMPRESARIAL

Tu sistema ahora puede manejar archivos de cientos de MB con:

- Timeouts extendidos (45 min)
- Feedback en tiempo real
- Performance optimizada
- Manejo robusto de errores
