# Documentación del Proyecto

Este directorio agrupa toda la documentación técnica del proyecto, organizada por tema. Para la descripción general del proyecto, el stack y los endpoints, consulta el [`README.md`](../README.md) raíz.

## Índice

### 📡 Endpoints

Documentación detallada de endpoints específicos de la API.

- [`ENDPOINT_VENDEDOR_ITEMS.md`](endpoints/ENDPOINT_VENDEDOR_ITEMS.md) — Endpoint de vendedores con clientes e items, filtros por rol, paginación, códigos de error.

### 🚀 Postman

Guías y colecciones para consumir la API con Postman.

- [`GUIA_POSTMAN_VENDEDORES_ITEMS.md`](postman/GUIA_POSTMAN_VENDEDORES_ITEMS.md) — Guía específica del endpoint de vendedores/items.
- [`POSTMAN_GUIDE.md`](postman/POSTMAN_GUIDE.md) — Guía general de uso de Postman con la API.
- [`POSTMAN_RAPIDO.md`](postman/POSTMAN_RAPIDO.md) — Inicio rápido con Postman.
- [`POSTMAN_IMPORTACION_OPTIMIZADA.md`](postman/POSTMAN_IMPORTACION_OPTIMIZADA.md) — Pruebas del importador optimizado.

### 📥 Importador

Documentación del motor de importación de ventas y cuotas.

- [`IMPORTADOR_README.md`](importador/IMPORTADOR_README.md) — Visión general del importador.
- [`IMPORTADOR_SETUP.md`](importador/IMPORTADOR_SETUP.md) — Setup e instalación del importador.
- [`OPTIMIZACION_IMPORTACION.md`](importador/OPTIMIZACION_IMPORTACION.md) — Optimizaciones aplicadas al importador.
- [`CUOTA_CATEGORIA_IMPORT_README.md`](importador/CUOTA_CATEGORIA_IMPORT_README.md) — Importación de cuotas por categoría.

### ⚙️ Configuración

Archivos de configuración del servidor y del entorno.

- [`instrucciones.md`](configuracion/instrucciones.md) — Instrucciones generales de configuración.
- [`CONFIG_ARCHIVOS_GIGANTES.md`](configuracion/CONFIG_ARCHIVOS_GIGANTES.md) — Configuración para archivos de hasta 6 GB (límite actual de la API).
- [`CONFIGURACION_ARCHIVOS_GRANDES.md`](configuracion/CONFIGURACION_ARCHIVOS_GRANDES.md) — Configuración histórica para archivos de hasta 200 MB (versión previa a la optimización).

### 📐 Reglas de Negocio

Validaciones, rendimiento y reglas específicas del dominio.

- [`VALIDACIONES_ESTRICTAS.md`](reglas-de-negocio/VALIDACIONES_ESTRICTAS.md) — Validaciones estrictas aplicadas a la API.
- [`VALIDACION_CUOTAS_MARZO.md`](reglas-de-negocio/VALIDACION_CUOTAS_MARZO.md) — Validación específica de cuotas del período de marzo 2026.
- [`RENDIMIENTO_Y_SOLUCIONES.md`](reglas-de-negocio/RENDIMIENTO_Y_SOLUCIONES.md) — Decisiones de rendimiento y problemas resueltos.

---

## Archivos que NO están aquí

- **`README.md`** (raíz) — descripción general del proyecto, stack, arquitectura y endpoints principales.
- **`CLAUDE.md`** (raíz) — contexto del proyecto para Claude AI.
- **`.github/copilot-instructions.md`** — instrucciones para GitHub Copilot.
- **`postman/`** — colecciones de Postman exportadas (`.json`).
- **`impactos/README.md`** — README del directorio de backups de impacto.

Las notas de trabajo, análisis específicos y reportes puntuales (archivos `ANALISIS_*`, `CORRECCION*`, `GUIA_RAPIDA_*`, `RESUMEN_*`, `REPORTE_*`, `IMPLEMENTACION_*`, `INICIO_*`, `PROXIMOS_PASOS`, `CHECKLIST_*`, `FIX_*`, `CAMBIOS_*`) se conservan en la raíz del proyecto y no se incluyen aquí porque son documentos de un momento concreto, no documentación mantenible del proyecto.
