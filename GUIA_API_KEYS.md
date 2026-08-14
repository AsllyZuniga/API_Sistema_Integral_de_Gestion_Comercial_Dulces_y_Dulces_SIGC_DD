# Guía de API Keys — SIGC-DD

Autenticación por **API key** para integraciones externas (scripts, BI, apps de terceros).
El frontend sigue usando JWT (`Authorization: Bearer <jwt>`); ambos mecanismos conviven sin cambios.

---

## 0. URL base

| Entorno | URL base | Nota |
|---|---|---|
| **Producción (desplegada)** | `http://ec2-3-224-183-31.compute-1.amazonaws.com` | nginx (:80) → API. Usar esta para integraciones |
| Desarrollo local | `http://localhost:3000` | Solo para pruebas en máquina local |

Todos los ejemplos de esta guía usan la URL de producción. El health check público es
`GET /health` (sin autenticación).

---

## 1. Política de seguridad

| Regla | Detalle |
|---|---|
| Métodos permitidos | **Solo `GET`** (lectura). Cualquier otro método → `403` |
| Scope requerido | `read` |
| Key inválida o ausente en header de API key | `401` |
| Identidad resultante | `req.auth = { rol: '1', apiKeyAuth: true }` (perfil de lectura admin) |
| Comparación de tokens | Timing-safe (a prueba de timing attacks) |
| Logs | Nunca se registra el token; solo el `keyId` |

Las peticiones con API key pasan todos los guards `requireAuthJWT` y `requireAdmin`
(perfil de lectura). Las rutas de login/registro (`/api/auth`) quedan fuera del flujo de API keys.

---

## 2. Dónde enviar la API key

Dos opciones (header HTTP):

| Header | Formato | Nota |
|---|---|---|
| `X-API-Key` | `X-API-Key: <TU_API_KEY>` | **Recomendado**. Estricto: si el token no es una key válida → `401` |
| `Authorization` | `Authorization: Bearer <TU_API_KEY>` | Compatible. Si el token no es una key, se intenta validar como JWT |

> Si una petición trae ambos headers, `X-API-Key` tiene prioridad.

---

## 3. Ejemplos de uso

### 3.1 cURL

```bash
# Recomendado: header X-API-Key
curl -s "http://ec2-3-224-183-31.compute-1.amazonaws.com/api/ciudad" \
  -H "X-API-Key: <TU_API_KEY>"

# Alternativa: Bearer
curl -s "http://ec2-3-224-183-31.compute-1.amazonaws.com/api/ciudad" \
  -H "Authorization: Bearer <TU_API_KEY>"

# Con filtros (rango de fechas + proveedor + categoría + ciudad)
curl -s "http://ec2-3-224-183-31.compute-1.amazonaws.com/api/mes/cumplimiento/front?fechaInicio=2026-07-01&fechaFin=2026-07-31&proveedor=1408,1167&categoria=645,705&ciudad=155" \
  -H "X-API-Key: <TU_API_KEY>"

# Guardar respuesta en archivo (respuestas grandes)
curl -s "http://ec2-3-224-183-31.compute-1.amazonaws.com/api/items-vendidos?fechaInicio=2026-07-06&fechaFin=2026-07-11" \
  -H "X-API-Key: <TU_API_KEY>" -o items.json
```

### 3.2 Postman

1. Crear request `GET` con la URL del endpoint.
2. Pestaña **Headers** → agregar:
   - Key: `X-API-Key`
   - Value: `<TU_API_KEY>`
3. (Opcional) En **Settings** del request desactivar "Automatically follow redirects" si se depura.
4. Para reutilizar la key en toda la colección: **Variables** de colección →
   `apiKey = <TU_API_KEY>` y en el header usar `{{apiKey}}`.

Alternativa con la pestaña **Authorization**:
- Type: `API Key`
- Key: `X-API-Key`
- Value: `<TU_API_KEY>`
- Add to: `Header`

### 3.3 Insomnia

1. Crear request `GET`.
2. Pestaña **Auth** → `Bearer` **no**; usar **Header** directamente:
   - pestaña **Headers** → `X-API-Key` : `<TU_API_KEY>`
3. O bien **Auth** → `API Key`:
   - Key: `X-API-Key`, Value: `<TU_API_KEY>`, Add to: `Header`
4. Para entornos: **Environments** → variable `api_key` y en el header `X-API-Key: {{ _.api_key }}`.

### 3.4 JavaScript (fetch)

```javascript
const res = await fetch(
  'http://ec2-3-224-183-31.compute-1.amazonaws.com/api/semana/cumplimiento/front?fechaInicio=2026-07-06&fechaFin=2026-07-11',
  { headers: { 'X-API-Key': '<TU_API_KEY>' } }
);
const data = await res.json();
```

---

## 4. Respuestas de error

| Código | Causa | Mensaje |
|---|---|---|
| `401` | Header `X-API-Key` con token desconocido | `{ "message": "API key inválida" }` |
| `401` | Sin headers de auth en ruta protegida | `{ "message": "Token JWT requerido en header Authorization: Bearer <token>" }` |
| `403` | Método distinto de GET con API key | `{ "message": "Las API keys solo tienen acceso de lectura" }` |
| `403` | Key válida sin scope requerido | `{ "message": "Se requiere el permiso \"<scope>\" para esta operación" }` |

---

## 5. Configuración de keys

Las keys **no viven en base de datos**; se cargan por configuración/entorno (`config/apiKeys.js`).

| Entorno | Fuente |
|---|---|
| Desarrollo | `config/apiKeys.json` (gitignored). Plantilla: `config/apiKeys.example.json` |
| Producción | **Solo** variables de entorno: `API_KEYS_JSON` (JSON inline) o `API_KEYS_FILE` (ruta a archivo JSON). El archivo de dev se ignora a propósito |

Formato:

```json
{
  "keys": [
    { "keyId": "mi-integracion", "token": "<token>", "scopes": ["read"] }
  ]
}
```

- `scopes` válidos: `read`, `write`, `update`, `delete` (hoy solo se exige `read`).
- Rotación: editar el archivo/entorno y reiniciar el servidor.

---

## 6. Endpoints accesibles con API key

Todos los `GET` bajo `/api` (excepto `/api/auth`). Los métodos POST/PUT/PATCH/DELETE
devuelven `403` con API key.

### 6.1 Cumplimiento (mes / semana / día)

| Endpoint | Descripción |
|---|---|
| `GET /api/mes/cumplimiento/front` | Cumplimiento mensual por vendedor (vista front) |
| `GET /api/mes/cumplimiento/front/me` | Ídem, scope del vendedor autenticado (con API key devuelve vista global) |
| `GET /api/mes/cumplimiento/lineas` | Cumplimiento por líneas (role-aware) |
| `GET /api/mes/cumplimiento/ciudades-global` | Cumplimiento global por ciudades |
| `GET /api/mes/cumplimiento/vendedor/:codigoVendedor` | Cumplimiento de un vendedor |
| `GET /api/mes/cumplimiento/vendedor/:codigoVendedor/lineas` | Líneas de un vendedor |
| `GET /api/mes/cumplimiento/vendedor/:codigoVendedor/linea/:codigoLinea` | Línea específica de un vendedor |
| `GET /api/mes/cumplimiento/vendedor/:codigoVendedor/ciudades` | Ciudades de un vendedor |
| `GET /api/mes/cumplimiento/vendedor/:codigoVendedor/ciudad/:idCiudad` | Ciudad específica de un vendedor |
| `GET /api/mes/cumplimiento/vendedor/:codigoVendedor/productos` | **Detalle por ítem** de un vendedor |
| `GET /api/mes/cumplimiento/` | Listado general |
| `GET /api/mes/cumplimiento/:codigo` | Por código |
| `GET /api/semana/cumplimiento/front` | Cumplimiento semanal por vendedor |
| `GET /api/semana/cumplimiento/front/me` | Scope del vendedor autenticado (con API key, vista global) |
| `GET /api/semana/cumplimiento/lineas` | Líneas semanal (role-aware) |
| `GET /api/semana/cumplimiento/ciudades` | Ciudades semanal (role-aware) |
| `GET /api/semana/cumplimiento/vendedor/:codigoVendedor/lineas` | Líneas de un vendedor |
| `GET /api/semana/cumplimiento/vendedor/:codigoVendedor/linea/:codigoLinea` | Línea específica |
| `GET /api/semana/cumplimiento/vendedor/:codigoVendedor/ciudades` | Ciudades de un vendedor |
| `GET /api/semana/cumplimiento/vendedor/:codigoVendedor/productos` | **Detalle por ítem** de un vendedor |
| `GET /api/semana/cumplimiento/:codigo` | Por código |
| `GET /api/dia/cumplimiento/front` | Cumplimiento diario por vendedor |
| `GET /api/dia/cumplimiento/front/me` | Scope del vendedor autenticado (con API key, vista global) |
| `GET /api/dia/cumplimiento/vendedores` | Todos los vendedores (día) |
| `GET /api/dia/cumplimiento/vendedor/:codigoVendedor` | Un vendedor |
| `GET /api/dia/cumplimiento/supervisor/:idSupervisor` | Equipo de un supervisor |

Legacy semana (vigentes): `GET /api/semana/cumplimiento/lineas/:codigoVendedor`,
`/lineas/:codigoVendedor/:codigoLinea`, `/ciudades/:codigoVendedor`, `/productos/:codigoVendedor`.

### 6.2 Detalle por ítem y por cliente

| Endpoint | Descripción |
|---|---|
| `GET /api/items-vendidos` | **Detalle por ítem** (ventas agrupadas por producto) |
| `GET /api/cliente/productos-por-cliente` | **Detalle por cliente** (productos por cliente) |
| `GET /api/cliente/productos-por-cliente/vendedor/:idVendedor` | Detalle por cliente de un vendedor |
| `GET /api/vendedor/con-items-comprados` | Vendedores + ítems + clientes comprados (paginado: `vendedoresPage`, `vendedoresLimit`) |
| `GET /api/items` | Catálogo de ítems |
| `GET /api/items/:id` | Ítem por ID |
| `GET /api/cliente` | Listado de clientes |
| `GET /api/cliente/:id` | Cliente por ID |
| `GET /api/venta` | Ventas |
| `GET /api/venta/:id` | Venta por ID |
| `GET /api/detalle_venta` | Detalles de venta |
| `GET /api/detalle_venta/:id` | Detalle por ID |

### 6.3 Vendedores y usuarios

| Endpoint | Descripción |
|---|---|
| `GET /api/vendedor` | Listado de vendedores |
| `GET /api/vendedor/:id` | Vendedor por ID |
| `GET /api/vendedor/supervisor/:id_supervisor` | Vendedores de un supervisor |
| `GET /api/usuario` | Listado de usuarios |
| `GET /api/usuario/supervisores` | Solo supervisores |
| `GET /api/usuario/:id` | Usuario por ID |
| `GET /api/roles` | Roles |
| `GET /api/roles/:id` | Rol por ID |
| `GET /api/roles/cuota-dia/por-supervisor` | Cuota día por supervisor |
| `GET /api/roles/cuota-dia/por-vendedor` | Cuota día por vendedor |

### 6.4 Cuotas

| Endpoint | Descripción |
|---|---|
| `GET /api/cuota-categoria/general` | Cuotas por categoría (role-aware; acepta `mesAnio=YYYY-MM` o `fechaInicio`/`fechaFin`) |
| `GET /api/cuota-categoria/validar/marzo` | Validación de cuotas de marzo |
| `GET /api/cuota-mes` · `GET /api/cuota-mes/:id` | Cuotas mensuales |
| `GET /api/cuota-semana` · `GET /api/cuota-semana/:id` | Cuotas semanales |
| `GET /api/cuota-dia` · `GET /api/cuota-dia/:id` | Cuotas diarias |
| `GET /api/cuota-dia/por-dia` | Cuota diaria por día |
| `GET /api/cuota-proveedor` · `GET /api/cuota-proveedor/:id` | Cuotas por proveedor |
| `GET /api/cuota-categoria-import` · `/actuales` | Imports de cuota categoría |
| `GET /api/vendedor-cuota-proveedor` | Asignaciones vendedor→proveedor |
| `GET /api/vendedor-cuota-proveedor/vendedor/:id_vendedor` | Por vendedor |
| `GET /api/vendedor-cuota-proveedor/proveedor/:id_proveedor` | Por proveedor |
| `GET /api/vendedor-cuota-proveedor/:id` | Por ID |
| `GET /api/vendedor-cuota-categoria` | Asignaciones vendedor→categoría |
| `GET /api/vendedor-cuota-categoria/vendedor/:id_vendedor` | Por vendedor |
| `GET /api/vendedor-cuota-categoria/categoria/:id_categoria` | Por categoría |
| `GET /api/vendedor-cuota-categoria/rango/consultar` | Consulta por rango |
| `GET /api/vendedor-cuota-categoria/:id` | Por ID |

### 6.5 Catálogos y geolocalización

| Endpoint | Descripción |
|---|---|
| `GET /api/proveedor` | Proveedores |
| `GET /api/proveedor/:id` | Proveedor por ID |
| `GET /api/proveedor/:codigo/categorias` | Categorías de un proveedor |
| `GET /api/categoria` · `/:id` | Categorías |
| `GET /api/subcategoria` · `/:id` | Subcategorías |
| `GET /api/megacategoria` · `/:id` | Megacategorías |
| `GET /api/ciudad` · `/:id` | Ciudades |
| `GET /api/barrio` · `/:id` | Barrios |
| `GET /api/canale` · `/:id` | Canales |
| `GET /api/subcanale` · `/:id` | Subcanales |
| `GET /api/tipos_negocio` · `/:id` | Tipos de negocio |
| `GET /api/tipos_documento` · `/:id` | Tipos de documento |
| `GET /api/obsequio` · `/:id` | Obsequios |
| `GET /api/rango-dias` · `/:id` | Rangos de días |
| `GET /api/rango-dias/mes-actual/habiles` | Días hábiles del mes actual |

### 6.6 Filtros, import/export y administración

| Endpoint | Descripción |
|---|---|
| `GET /api/filtros/opciones` | Opciones de filtros del front (proveedores, categorías, etc.) |
| `GET /api/import/status` | Estado de importaciones |
| `GET /api/admin/ventas/preview` | Preview de ventas (admin) |
| `GET /api/admin/ventas/job/:jobId` | Estado de job de ventas |

> **No accesibles con API key:** `/api/auth/*` (login/registro, fuera del middleware),
> cualquier ruta que solo exista como POST/PUT/DELETE (p. ej. `/api/cuotas/*`,
> `/api/cuota-categoria-import` POST, writes de CRUD).

---

## 7. Soporte multifiltro (query params)

Aplican a endpoints de cumplimiento, `items-vendidos`, `productos-por-cliente`,
`filtros/opciones` y `cuota-categoria/general`. Todos aceptan **valores múltiples
separados por coma** y se pueden combinar entre sí.

| Parámetro | Alias aceptados | Ejemplo |
|---|---|---|
| `fechaInicio` | — | `2026-07-01` (obligatorio en reportes) |
| `fechaFin` | — | `2026-07-31` |
| `mesAnio` | — | `2026-07` (solo `cuota-categoria/general`) |
| `vendedor` | `codVendedor` (semana/día) | `vendedor=0455,0550` |
| `proveedor` | `codProveedor` (día) | `proveedor=1408,1167` |
| `categoria` | `categorias`, `codCategoria` (día) | `categoria=645,705` |
| `ciudad` | `codCiudad` (semana/día) | `ciudad=155` |
| `vendedoresPage`, `vendedoresLimit` | — | Paginación en `con-items-comprados` |

Notas por periodo (parámetros que lee cada `getFilters`):

- **mes**: `vendedor`, `proveedor`, `categoria`, `ciudad` (enviar también los alias si se quiere compatibilidad con el front).
- **semana**: `vendedor|codVendedor`, `proveedor`, `categoria`, `ciudad|codCiudad`.
- **día**: acepta todos los alias (`vendedor|codVendedor`, `proveedor|codProveedor`, `categoria|codCategoria`, `ciudad|codCiudad`).

Ejemplo multifiltro completo:

```
GET /api/mes/cumplimiento/front?fechaInicio=2026-07-01&fechaFin=2026-07-31&proveedor=1408,1167,1192,7302&codProveedor=1408,1167,1192,7302&categoria=645,705&codCategoria=645,705&ciudad=155&codCiudad=155
```

---

## 8. Consideraciones operativas

- **Respuestas grandes**: algunos endpoints devuelven decenas de MB
  (`/api/cliente/productos-por-cliente` ≈ 95 MB sin filtros, `/api/items` ≈ 5 MB,
  `/api/vendedor/con-items-comprados` ≈ 1.3 MB). Usar compresión gzip si el cliente
  lo soporta (`Accept-Encoding: gzip`) y/o acotar con filtros de fecha/proveedor/categoría.
- **Timeouts**: el servidor permite requests largos (hasta 4 h), pero conviene
  fijar timeouts del lado del cliente (30–60 s) y reintentar.
- **Caché**: los endpoints de cumplimiento responden con `Cache-Control: no-store`;
  no se sirven `304`.
- **Concurrencia**: evitar lanzar muchos reportes pesados en paralelo contra la BD
  de producción; pueden agotar el pool de conexiones y degradar el resto de la API.

---

## 9. Verificación rápida

```bash
# Key válida → 200
curl -s -o /dev/null -w "%{http_code}\n" http://ec2-3-224-183-31.compute-1.amazonaws.com/api/ciudad -H "X-API-Key: <TU_API_KEY>"

# Key inválida → 401
curl -s http://ec2-3-224-183-31.compute-1.amazonaws.com/api/ciudad -H "X-API-Key: mala"

# Escritura con key → 403
curl -s -X POST http://ec2-3-224-183-31.compute-1.amazonaws.com/api/canale -H "X-API-Key: <TU_API_KEY>" \
  -H "Content-Type: application/json" -d '{"nombre":"x"}'
```
