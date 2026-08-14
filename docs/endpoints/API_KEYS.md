# API Keys — Integraciones Externas (Solo Lectura)

## Objetivo

Aplicaciones externas consumen únicamente endpoints **GET** de la API mediante
tokens estáticos, sin usuarios, login, JWT, OAuth2 ni cambios en la base de datos.
Cualquier método que modifique información (POST, PUT, PATCH, DELETE) queda
**bloqueado** para peticiones autenticadas con API key.

## Cómo funciona

`middlewares/apiKeyMiddleware.js` expone `apiKeyOrJwt`, montado globalmente en
`app.js` sobre `/api` (justo después de `/api/auth`, por lo que login/registro no
se ven afectados):

1. Si la petición trae API key → se valida como API key.
2. Si no trae API key → se delega en el JWT existente (el frontend actual sigue
   funcionando igual).

## Cabeceras soportadas

Precedencia: `Authorization` sobre `X-API-Key`.

```
Authorization: Bearer <TOKEN>
X-API-Key: <TOKEN>
```

## Respuestas

| Caso | HTTP | Body |
|---|---|---|
| Sin header de API key | — | fallback a JWT |
| Token inválido o inexistente | 401 | `{ message: "API key inválida" }` |
| Token válido, método ≠ GET | 403 | `{ message: "Las API keys solo tienen acceso de lectura" }` |
| Token válido, GET sin scope `read` | 403 | `{ message: "Se requiere el permiso \"read\"..." }` |
| Token válido, GET con scope `read` | 200 | — |

En peticiones autenticadas por API key se setea:

- `req.apiKey = { keyId, scopes }` — para logs; **el token nunca se expone**.
- `req.auth = { rol: '1', apiKeyAuth: true }` — perfil de lectura equivalente a
  admin para que los controllers role-aware (`items-vendidos`, cumplimiento, etc.)
  funcionen sin modificarlos.

## Configuración (sin base de datos)

### Desarrollo (`NODE_ENV != production`)

`config/apiKeys.json` (gitignored). Copia desde `config/apiKeys.example.json`:

```json
{
  "keys": [
    { "keyId": "dev-external-app", "token": "<hex-token>", "scopes": ["read"] }
  ]
}
```

### Producción (`NODE_ENV=production`)

Solo se leen estas fuentes (el archivo de desarrollo se ignora):

- Variable `API_KEYS_JSON` (string JSON, mismo formato).
- Alternativa: `API_KEYS_FILE=/ruta/archivo.json`.

```dotenv
API_KEYS_JSON={"keys":[{"keyId":"external-app","token":"<hex-token>","scopes":["read"]}]}
# o
API_KEYS_FILE=/ruta/a/apiKeys.prod.json
```

### Generar token

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Scopes

Arquitectura extensible: mapa `GET→read`, `POST→write`, `PUT/PATCH→update`,
`DELETE→delete`. La política vigente bloquea todo método ≠ GET para API keys;
los scopes se mantienen por si se quiere granularidad futura. Las keys de
ejemplo usan `["read"]`.

## Seguridad

- Comparación con SHA-256 + `crypto.timingSafeEqual` (resistente a timing attacks;
  la longitud del token real no es deducible). Ver `utils/timingSafe.js`.
- Nunca se registra el token completo en logs; solo `keyId`.
- Errores 401/403 con mensajes genéricos, sin detalles internos.
- Revocación: quitar el token de la fuente configurada y reiniciar el proceso.
- Múltiples tokens soportados (varias apps, una key cada una).
- Configuración centralizada en `config/apiKeys.js`.
- Aislamiento dev/prod: tokens de desarrollo jamás válidos en producción.

## Pruebas

```bash
# GET válido (200)
curl -i http://localhost:3000/api/filtros/opciones -H "Authorization: Bearer <dev-token>"

# Escritura bloqueada (403)
curl -i -X POST http://localhost:3000/api/cliente -H "Authorization: Bearer <dev-token>" -H "Content-Type: application/json" -d '{}'

# Token inválido (401)
curl -i http://localhost:3000/api/filtros/opciones -H "X-API-Key: token-incorrecto"

# Sin API key -> JWT (401 si no hay JWT válido)
curl -i http://localhost:3000/api/filtros/opciones
```

## Archivos involucrados

| Archivo | Rol |
|---|---|
| `middlewares/apiKeyMiddleware.js` | Middleware `apiKeyOrJwt` / `requireApiKey` |
| `services/apiKeyService.js` | Lógica: extracción, lookup timing-safe, scopes |
| `utils/timingSafe.js` | Comparación segura |
| `config/apiKeys.js` | Carga centralizada (config + entorno) |
| `config/apiKeys.example.json` | Template (committed) |
| `config/apiKeys.json` | Keys de desarrollo (gitignored) |
| `app.js` | Montaje global de `apiKeyOrJwt` |
