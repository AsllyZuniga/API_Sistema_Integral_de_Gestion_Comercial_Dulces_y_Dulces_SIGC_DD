# Endpoint: Actualizacion de Contrasena de Usuario

## Descripcion

Endpoint para actualizar la contrasena de cualquier usuario del sistema.
**Protegido:** solo administradores (rol = 1) pueden usarlo.

No existe un endpoint dedicado de cambio de contrasena. La funcionalidad esta integrada en la actualizacion general del usuario.

---

## Ruta

```
PUT /api/usuario/:id
```

> **Requiere `Authorization: Bearer <token>`** con **rol = 1** (administrador).

---

## Autenticacion y Autorizacion

| Middleware | Funcion | Respuesta en fallo |
|-----------|---------|-------------------|
| `requireAuthJWT` | Valida el token JWT en el header `Authorization: Bearer <token>` | `401 Unauthorized` |
| Verificacion de rol | Comprueba que `req.auth.rol === 1` | `403 Forbidden` |

### Codigos de error de autenticacion

| Status | Mensaje | Causa |
|--------|---------|-------|
| `401` | `"Token JWT requerido en header Authorization: Bearer <token>"` | Header ausente o no es Bearer |
| `401` | `"Token JWT invalido o expirado"` | Token malformado, firma invalida o expirado |
| `403` | `"Acceso restringido a administradores"` | Usuario autenticado no es admin (rol !== 1) |

---

## Request Body

```json
{
  "password": "nueva_contrasena_123"
}
```

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `password` | `string` | No | Nueva contrasena en texto plano. Si se omite o es vacio, se conserva la actual. |
| `username` | `string` | No | Opcional — actualizar tambien el username |
| `estado` | `boolean` | No | Opcional — actualizar estado del usuario |
| `id_rol` | `integer` | No | Opcional — cambiar rol del usuario |

### Comportamiento del campo password

- **Omision (`undefined`)**: la contrasena no se modifica.
- **Vacio (`""`)**: la contrasena no se modifica.
- **Texto plano**: se hashea automaticamente con bcrypt (10 rondas).
- **Hash bcrypt existente**: se almacena tal cual (para reimportacion de datos).

> **No requiere** `current_password` ni `password_confirmation`. El administrador puede sobrescribir la contrasena sin conocer la anterior.

---

## Respuestas

| Status | Descripcion |
|--------|-------------|
| `200 OK` | Usuario actualizado exitosamente. Retorna el objeto completo del usuario. |
| `400 Bad Request` | Error de validacion o base de datos. |
| `401 Unauthorized` | Token JWT ausente o invalido. |
| `403 Forbidden` | El usuario autenticado no es administrador. |
| `404 Not Found` | El `:id` del usuario no existe en la base de datos. |

### Ejemplo respuesta exitosa (200 OK)

```json
{
  "id_usuario": 1,
  "username": "admin01",
  "password": "$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36PQm4sEPhMNPfFhpYNzR6",
  "estado": true,
  "id_rol": 1
}
```

### Ejemplo respuesta error (403 Forbidden)

```json
{
  "message": "Acceso restringido a administradores"
}
```

### Ejemplo respuesta error (404 Not Found)

```json
{
  "message": "usuario Not Found"
}
```

---

## Ejemplos con curl

### Actualizar contrasena de usuario (admin)

```bash
curl -X PUT http://localhost:3000/api/usuario/5 \
  -H "Authorization: Bearer <token-admin>" \
  -H "Content-Type: application/json" \
  -d '{"password": "nuevaPass123"}'
```

### Intento sin token (401)

```bash
curl -X PUT http://localhost:3000/api/usuario/5 \
  -H "Content-Type: application/json" \
  -d '{"password": "nuevaPass123"}'
```

### Intento con token de vendor (403)

```bash
curl -X PUT http://localhost:3000/api/usuario/5 \
  -H "Authorization: Bearer <token-vendor>" \
  -H "Content-Type: application/json" \
  -d '{"password": "nuevaPass123"}'
```

---

## Roles afectados

| Quien puede usarlo? | Que usuarios puede modificar? |
|---------------------|-------------------------------|
| Admin (rol=1) | Cualquier usuario (incluyendo otros admins) |
| Supervisor (rol=2) | Denegado (403) |
| Vendedor (rol=3) | Denegado (403) |

---

## Consideraciones de seguridad

1. **Solo administradores** pueden cambiar contrasenas. Ni vendedores ni supervisores tienen acceso.
2. No se requiere la contrasena actual para establecer una nueva.
3. Las contrasenas se almacenan siempre como hash bcrypt (10 rondas).
4. No hay endpoint de recuperacion de contrasena ("olvide mi contrasena") en esta API.
5. El login migra automaticamente contrasenas en texto plano a bcrypt en el primer inicio de sesion exitoso.
