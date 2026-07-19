# Endpoints: Eliminacion de Cuotas de Vendedores

## Descripcion

Conjunto de endpoints para eliminar cuotas de vendedores en los tres niveles de granularidad (diario, semanal, mensual), tanto de forma individual como masiva por usuario.

---

## 1. DELETE individual por ID

### Rutas

```
DELETE /api/cuota-mes/:id
DELETE /api/cuota-semana/:id
DELETE /api/cuota-dia/:id
```

### Autenticacion

Ninguna requerida actualmente. Las rutas no tienen middleware JWT.

### Request

```
DELETE /api/cuota-mes/5
Content-Type: application/json
```

Sin body.

### Respuestas

| Status | Descripcion | Body |
|--------|-------------|------|
| `200 OK` | Cuota eliminada | `{ id, cuota_mes, fecha_inicio, fecha_fin, id_usuario }` |
| `404 Not Found` | ID no existe | `{ message: "cuotaMes Not Found" }` |
| `400 Bad Request` | Error de servidor | `{ error }` |

### Nota importante

Eliminar una cuota no limpia automaticamente la FK `id_cuotaMes`/`id_cuotaSemana`/`id_cuotaDia` en la tabla `vendedor`. Para mantener la consistencia, usa el endpoint bulk (seccion 2) que si lo hace, o actualiza manualmente el vendedor despues del DELETE individual.

---

## 2. DELETE bulk por usuario (Admin Only)

### Ruta

```
DELETE /api/cuotas/usuario/:id_usuario
```

### Autenticacion

**Requerida.** Middleware `requireAdmin`:
- `401 Unauthorized` — token ausente o invalido
- `403 Forbidden` — el usuario autenticado no es administrador (`rol !== 1`)

### Request

```
DELETE /api/cuotas/usuario/5
Authorization: Bearer <token-admin>
Content-Type: application/json
```

Sin body.

### Respuestas

| Status | Body |
|--------|------|
| `200 OK` | Ver ejemplo abajo |
| `400 Bad Request` | `{ success: false, error: "..." }` |
| `401 Unauthorized` | `{ message: "Token JWT requerido..." }` |
| `403 Forbidden` | `{ message: "Acceso restringido a administradores" }` |

### Respuesta exitosa (200 OK)

```json
{
  "success": true,
  "data": {
    "cuota_mes": [
      {
        "id_cuotaMes": 1,
        "cuota_mes": "5000000",
        "fecha_inicio": "2026-03-01",
        "fecha_fin": "2026-03-31",
        "id_usuario": 5
      }
    ],
    "cuota_semana": [
      {
        "id_cuotaSemana": 2,
        "cuota_semana": "1250000",
        "fecha_inicio": "2026-03-02",
        "fecha_fin": "2026-03-08",
        "id_usuario": 5
      }
    ],
    "cuota_dia": [
      {
        "id_cuotaDia": 3,
        "cuota_dia": "250000",
        "fecha_inicio": "2026-03-01",
        "fecha_fin": "2026-03-31",
        "id_usuario": 5
      }
    ]
  },
  "message": "Cuotas eliminadas para usuario 5"
}
```

### Efectos secundarios

Ademas de eliminar los registros en `cuotaMes`, `cuotaSemana` y `cuotaDia`, este endpoint:

- Actualiza el vendedor vinculado al usuario, poniendo `id_cuotaMes = null`, `id_cuotaSemana = null` e `id_cuotaDia = null`.
- No afecta `vendedorCuotaProveedor`, `vendedorCuotaCategoria`, `cuotaProveedor` ni `cuotaCategoria`.

---

## Ejemplos con curl

### Eliminar cuota mensual individual

```bash
curl -X DELETE http://localhost:3000/api/cuota-mes/5
```

### Eliminar todas las cuotas de un usuario (admin)

```bash
curl -X DELETE http://localhost:3000/api/cuotas/usuario/5 \
  -H "Authorization: Bearer <token-admin>"
```

---

## Tabla resumen

| Metodo | Ruta | Auth | Ambito |
|--------|------|------|--------|
| `DELETE` | `/api/cuota-mes/:id` | No | Una cuota mensual |
| `DELETE` | `/api/cuota-semana/:id` | No | Una cuota semanal |
| `DELETE` | `/api/cuota-dia/:id` | No | Una cuota diaria |
| `DELETE` | `/api/cuotas/usuario/:id_usuario` | Si (Admin) | Todas las cuotas del usuario + limpia FK |
