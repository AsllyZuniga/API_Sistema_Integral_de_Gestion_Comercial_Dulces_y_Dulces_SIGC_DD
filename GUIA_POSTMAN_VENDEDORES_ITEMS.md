# 📖 Guía Rápida: Testear Endpoint en Postman

## 1️⃣ Crear Nueva Solicitud en Postman

1. **Abre Postman** (o usa la colección existente)
2. Click en **"+"** → **New Request**
3. Dale un nombre: `Vendedores con Clientes e Items`
4. Selecciona la carpeta donde guardar (ej: `/postman/`)

## 2️⃣ Configurar la Solicitud

### Método y URL
- **Método**: `GET`
- **URL**: 
  ```
  {{base_url}}/vendedor/con-items-comprados
  ```
  
  O si no tienes variable de entorno:
  ```
  http://localhost:3000/vendedor/con-items-comprados
  ```

### Headers (si necesitas autenticación)
Agrega en la pestaña **Headers**:
```
Authorization: Bearer {{token}}
```

### Parámetros Query
Agrega en la pestaña **Params**:

| Key | Value | Descripción |
|-----|-------|-------------|
| vendedoresPage | 1 | Página de vendedores (solo admin/supervisor) |
| vendedoresLimit | 10 | Cuántos vendedores por página (max 100) |
| fechaInicio | 2026-01-01 | (Opcional) Fecha inicio del rango |
| fechaFin | 2026-01-31 | (Opcional) Fecha fin del rango |

> **Notas**:
> - Solo se pagina el nivel de VENDEDORES. Los clientes (por vendedor) e items (por cliente) se devuelven completos.
> - Para el rol **VENDEDOR**, la paginación no aplica (siempre devuelve 1 único vendedor).
> - Con fechas, **se excluyen** los vendedores/clientes sin actividad en el rango. Sin fechas, mantiene el comportamiento v1.3.0.

## 3️⃣ Ejemplos Rápidos para Copiar-Pegar

### Opción A: URL Completa en el Navegador
```
http://localhost:3000/vendedor/con-items-comprados?vendedoresPage=1&vendedoresLimit=10
```

### Opción B: Curl (Terminal)
```bash
curl -X GET "http://localhost:3000/vendedor/con-items-comprados?vendedoresLimit=10"
```

### Opción C: Curl con Autenticación
```bash
curl -X GET "http://localhost:3000/vendedor/con-items-comprados" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

## 4️⃣ Casos de Prueba en Postman

### Test 1: Datos Básicos (valores por defecto)
1. Pega en **URL**: `{{base_url}}/vendedor/con-items-comprados`
2. Click **Send**
3. Espera respuesta

**Esperado**: 
- `success: true`
- Array de vendedores con clientes e items

---

### Test 2: Pocos Resultados (Dashboard)
1. **Params**:
   - `vendedoresLimit` = `1`
2. Click **Send**

**Esperado**: 
- 1 vendedor
- Todos sus clientes (sin límite)
- Todos los items de cada cliente (sin límite)

---

### Test 3: Segunda Página de Vendedores
1. **Params**:
   - `vendedoresPage` = `2`
   - `vendedoresLimit` = `10`
2. Click **Send**

**Esperado**: 
- Vendedores en posición 11-20
- Cada uno con todos sus clientes e items
- Paginación muestra `page: 2`

---

### Test 4: Reporte Completo (todos los vendedores)
1. **Params**:
   - `vendedoresLimit` = `100`
2. Click **Send**

**Esperado**: 
- Hasta 100 vendedores
- Cada uno con todos sus clientes e items completos
- Response puede ser muy grande

---

### Test 5: Filtrar por Rango de Fechas (v1.4.0+)
1. **Params**:
   - `vendedoresLimit` = `20`
   - `fechaInicio` = `2026-01-01`
   - `fechaFin` = `2026-01-31`
2. Click **Send**

**Esperado**: 
- Solo vendedores que tuvieron ventas en enero 2026
- Solo clientes que compraron en enero 2026
- Solo items comprados en enero 2026
- Vendedores sin actividad en el rango NO aparecen

---

### Test 6: Vendedor (rol 3) - Solo sus datos
1. **Params**:
   - `fechaInicio` = `2026-01-01`
   - `fechaFin` = `2026-01-31`
2. Click **Send** con token de un vendedor

**Esperado**: 
- Solo 1 vendedor (el autenticado)
- Solo sus clientes con compras en el rango
- Solo sus items en el rango
- Paginación no aplica

---

## 5️⃣ Interpretar la Respuesta

### ✅ Éxito (200 OK)
```json
{
  "success": true,
  "data": {
    "vendedores": [ ... ],
    "paginacionVendedores": {
      "page": 1,
      "limit": 10,
      "total": 50
    }
  },
  "message": "Datos de vendedores, clientes e items obtenidos exitosamente"
}
```

**Qué significa**:
- `total: 50` → Hay 50 vendedores en total
- `page: 1, limit: 10` → Estoy viendo resultados 1-10
- `vendedores[]` → Array con los vendedores

### ❌ Error (500)
```json
{
  "success": false,
  "message": "Error al obtener vendedores con clientes e items",
  "error": "Connection refused"
}
```

**Qué verificar**:
- ¿Está el servidor corriendo? (`npm start`)
- ¿La base de datos está conectada?
- ¿El token es válido?

---

## 6️⃣ Verificar Estructura de Datos

En la pestaña **Tests** de Postman, puedes agregar validaciones:

```javascript
pm.test("Response success", function () {
  pm.expect(pm.response.json().success).to.equal(true);
});

pm.test("Tiene vendedores", function () {
  pm.expect(pm.response.json().data.vendedores).to.be.an('array');
});

pm.test("Tiene paginacion", function () {
  var pag = pm.response.json().data.paginacionVendedores;
  pm.expect(pag).to.have.property('page');
  pm.expect(pag).to.have.property('limit');
  pm.expect(pag).to.have.property('total');
});
```

Luego click en **Send** y verifica que los tests pasen ✅

---

## 7️⃣ Variables de Entorno Útiles

Si usas variables en Postman, agrega estas:

| Variable | Valor |
|----------|-------|
| `base_url` | `http://localhost:3000` |
| `token` | `tu_jwt_token_aqui` |

Luego las usas así:
- URL: `{{base_url}}/vendedor/con-items-comprados`
- Header: `Authorization: Bearer {{token}}`

---

## 8️⃣ Troubleshooting

### Problema: "Cannot GET /vendedor/con-items-comprados"
**Causa**: La ruta no está registrada  
**Solución**: Verifica que:
- El archivo `vendedorRouter.js` tenga la ruta
- El servidor se reinició después de los cambios

### Problema: "Response takes too long"
**Causa**: Demasiados resultados o DB lenta  
**Solución**: 
- Reduce `vendedoresLimit` (los clientes e items ya no se pueden reducir)
- Verifica que la BD esté respondiendo bien

### Problema: "Error al obtener vendedores..."
**Causa**: Error en la consulta  
**Solución**: 
- Revisa la consola del servidor (`npm start`)
- Verifica que los modelos estén correctos
- Verifica las relaciones en `models/index.js`

---

## 💡 Tips Extra

1. **Exporta los datos**: En la sección **Response**, clic en el ícono de descargar para guardar JSON
2. **Visualiza bonito**: Postman muestra JSON formateado automáticamente
3. **Compara respuestas**: Abre 2 tabs y compara diferentes pages
4. **Perfil la performance**: En la pestaña **Tests**, usa `console.log()`

```javascript
console.log("Response time: " + pm.response.responseTime + "ms");
```

---

¡Listo! Ya puedes testear el endpoint 🚀
