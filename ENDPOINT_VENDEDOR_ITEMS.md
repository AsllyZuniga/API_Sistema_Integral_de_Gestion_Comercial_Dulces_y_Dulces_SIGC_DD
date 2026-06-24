# Endpoint: Vendedores con Clientes e Items Comprados

## 📋 Descripción

Este endpoint trae una lista de **vendedores** con todos sus **clientes asociados** y los **items que cada cliente ha comprado**, optimizado para no sobrecargar la base de datos mediante **lazy loading** y **paginación en cada nivel**.

## 🔗 Ruta

```
GET /vendedor/con-items-comprados
```

> Requiere **Authorization: Bearer <token>** de cualquier rol autenticado.
> El alcance de los datos se determina por el **rol del token**:
> - **Admin (rol=1)**: devuelve todos los vendedores con sus clientes e items.
> - **Supervisor (rol=2)**: devuelve solo los vendedores asignados al supervisor (donde `id_supervisor = idUsuario` del token).
> - **Vendedor (rol=3)**: devuelve solo el vendedor autenticado (donde `id_vendedor = idVendedor` del token), con los clientes que él atendió y los items que esos clientes le compraron.

## ⚠️ URL ÚNICA Y OBLIGATORIA

**Esta es la ÚNICA URL válida para todos los roles**:

```
GET /api/vendedor/con-items-comprados
```

❌ **NO uses** la URL antigua `/api/vendedor/supervisor/con-items-comprados` (eliminado en v1.1.0, ahora retorna `410 Gone` con la URL correcta). Si tu frontend la usa, cámbiala a la URL única de arriba.

### Respuesta del endpoint obsoleto (410 Gone)
```json
{
  "success": false,
  "message": "Esta ruta está obsoleta. Use GET /api/vendedor/con-items-comprados (detecta el rol automáticamente por token).",
  "error": "ENDPOINT_OBSOLETO",
  "urlCorrecta": "/api/vendedor/con-items-comprados"
}
```

## ⚙️ Parámetros de Query (Todos Opcionales)

| Parámetro | Tipo | Valor por Defecto | Máximo | Descripción |
|-----------|------|-------------------|--------|-------------|
| `vendedoresPage` | `integer` | `1` | - | Página de vendedores |
| `vendedoresLimit` | `integer` | `10` | `100` | Items por página de vendedores |
| `fechaInicio` | `string (YYYY-MM-DD)` | - | - | Fecha inicial para filtrar ventas |
| `fechaFin` | `string (YYYY-MM-DD)` | - | - | Fecha final para filtrar ventas |

> **Nota**: Solo se pagina el nivel de **VENDEDORES**. Los clientes (de cada vendedor) e items (de cada cliente) se devuelven completos, sin paginación.

## 📥 Ejemplos de Llamadas

### Ejemplo 1: Uso Básico (valores por defecto)
```bash
curl -X GET "http://localhost:3000/vendedor/con-items-comprados"
```

### Ejemplo 1B: Con rango de fechas
```bash
curl -X GET "http://localhost:3000/vendedor/con-items-comprados?fechaInicio=2026-05-01&fechaFin=2026-05-31"
```

### Ejemplo 1B: Supervisor (solo vendedores asignados)
```bash
curl -X GET "http://localhost:3000/vendedor/con-items-comprados?vendedoresLimit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```
> El token del supervisor hace que el endpoint devuelva automáticamente solo sus vendedores asignados. No requiere endpoint separado.

### Ejemplo 1C: Vendedor (solo sus clientes)
```bash
curl -X GET "http://localhost:3000/vendedor/con-items-comprados?vendedoresLimit=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```
> El token del vendedor hace que el endpoint devuelva solo el registro de ese vendedor con los clientes que él atendió y los items que esos clientes le compraron. No requiere endpoint separado.

### Ejemplo 2: Con Paginación Personalizada
```bash
curl -X GET "http://localhost:3000/vendedor/con-items-comprados?vendedoresPage=1&vendedoresLimit=5"
```

### Ejemplo 3: Segunda página de vendedores
```bash
curl -X GET "http://localhost:3000/vendedor/con-items-comprados?vendedoresPage=2&vendedoresLimit=10"
```

### Ejemplo 4: Con Authorization (si está protegido)
```bash
curl -X GET "http://localhost:3000/vendedor/con-items-comprados" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📤 Respuesta de Éxito (200 OK)

```json
{
  "success": true,
  "data": {
    "vendedores": [
      {
        "id_vendedor": 1,
        "codigo_vendedor": "VEN-001",
        "nombre": "Juan Pérez",
        "clientes": [
          {
            "id_cliente": 10,
            "nro_documento": "12345678",
            "razon_social": "Tienda A SRL",
            "totalCompras": 25,
            "items": [
              {
                "id_item": 100,
                "descripcion": "Chocolate Premium",
                "codigo_item": "CHO-001",
                "cantidadTotal": 150.5,
                "veces": 8,
                "precio_unitario": 2500,
                "subtotal": 376250
              },
              {
                "id_item": 101,
                "descripcion": "Caramelos Mix",
                "codigo_item": "CAR-001",
                "cantidadTotal": 75.0,
                "veces": 3,
                "precio_unitario": 1200,
                "subtotal": 90000
              }
            ],
            "totalItems": 2
          },
          {
            "id_cliente": 11,
            "nro_documento": "87654321",
            "razon_social": "Confitería B",
            "totalCompras": 15,
            "items": [
              {
                "id_item": 102,
                "descripcion": "Dulce de Leche",
                "codigo_item": "DUL-001",
                "cantidadTotal": 200.0,
                "veces": 5,
                "precio_unitario": 3500,
                "subtotal": 700000
              }
            ],
            "totalItems": 1
          }
        ],
        "totalClientes": 2
      },
      {
        "id_vendedor": 2,
        "codigo_vendedor": "VEN-002",
        "nombre": "María García",
        "clientes": [],
        "totalClientes": 0
      }
    ],
    "paginacionVendedores": {
      "page": 1,
      "limit": 10,
      "total": 50
    }
  },
  "message": "Datos de vendedores, clientes e items obtenidos exitosamente"
}
```

## 📊 Estructura de Respuesta

### Nivel 1: Vendedores
```
vendedores[]
├── id_vendedor: número
├── codigo_vendedor: string
├── nombre: string
├── clientes[]: array de clientes (sin paginación, se devuelven todos)
└── totalClientes: número (cantidad de clientes en el array)
```

### Nivel 2: Clientes (dentro de cada vendedor)
```
clientes[]
├── id_cliente: número
├── nro_documento: string
├── razon_social: string
├── totalCompras: número (cantidad de ventas del cliente a este vendedor en el rango de fechas)
├── items[]: array de items comprados (sin paginación, se devuelven todos)
└── totalItems: número (cantidad de items en el array)
```

### Nivel 3: Items (dentro de cada cliente)
```
items[]
├── id_item: número
├── descripcion: string
├── codigo_item: string
├── cantidadTotal: número decimal (suma de cantidades compradas)
├── veces: número (cantidad de veces que se compró este item)
├── precio_unitario: número decimal (promedio)
└── subtotal: número decimal (suma)
```

### Paginación
```
paginacion*
├── page: número (página actual)
├── limit: número (items por página)
└── total: número (total de items disponibles)
```

## ⚠️ Respuestas de Error

### Error 400 - Token sin datos del rol
```json
{
  "success": false,
  "message": "No se pudo identificar el supervisor en el token",
  "error": "SUPERVISOR_NO_IDENTIFICADO"
}
```
```json
{
  "success": false,
  "message": "El token no contiene idVendedor",
  "error": "VENDEDOR_NO_IDENTIFICADO"
}
```

### Error 403 - Rol no autorizado
```json
{
  "success": false,
  "message": "Rol no autorizado para este endpoint"
}
```

### Error 500 - Error Interno del Servidor
```json
{
  "success": false,
  "message": "Error al obtener vendedores con clientes e items",
  "error": "Error específico"
}
```

## 🔄 Flujo de Carga

El endpoint pagina **solo el nivel de VENDEDORES**. Los clientes (por vendedor) e items (por cliente) se devuelven completos:

1. **Vendedores**: Se traen paginados según `vendedoresPage` y `vendedoresLimit`
2. **Clientes**: Para cada vendedor, se traen **TODOS** sus clientes (sin paginación)
3. **Items**: Para cada cliente, se traen **TODOS** los items comprados (sin paginación)

### Ventajas de este Enfoque

✅ **Paginación simple**: Solo se pagina el primer nivel  
✅ **Items completos**: Sin truncar el historial de compras del cliente  
✅ **Clientes completos**: Sin truncar la lista de clientes del vendedor  
✅ **Información Útil**: `totalCompras` y `veces` dan contexto de compras  

## 💡 Casos de Uso

### 1. Dashboard Principal - Ver Resumen
```bash
# Primer vendedor
GET /vendedor/con-items-comprados?vendedoresLimit=1
```

### 2. Ver Segunda Página de Vendedores
```bash
# Vendedores 11-20 (cada uno con todos sus clientes e items)
GET /vendedor/con-items-comprados?vendedoresPage=2&vendedoresLimit=10
```

### 3. Ver Historial Completo de un Vendedor
```bash
# 1 vendedor específico con todos sus clientes e items
GET /vendedor/con-items-comprados?vendedoresLimit=1
```

### 4. Reporte de Todos los Vendedores
```bash
# Hasta 100 vendedores por página
GET /vendedor/con-items-comprados?vendedoresLimit=100
```

## 🎯 Recomendaciones

- **Vendedores**: Paginar con `vendedoresPage` y `vendedoresLimit` (default 10, max 100). **Solo aplica a admin y supervisor**
- **Vendedor (rol 3)**: no se pagina (siempre devuelve 1 único vendedor)
- **Clientes**: Se devuelven completos por cada vendedor. Si un vendedor tiene 500 clientes, se traen los 500
- **Items**: Se devuelven completos por cada cliente. Si un cliente tiene 500 items, se traen los 500
- **Frontend**: Al hacer scroll en la lista de vendedores, incrementar `vendedoresPage` (botón "Cargar más vendedores")
- **Monitoreo**: Medir tiempos de respuesta; si un vendedor tiene muchos clientes, la respuesta puede ser pesada

## 📅 Filtrado por Fechas (a partir de v1.4.0)

Cuando se envían `fechaInicio` y/o `fechaFin`, el endpoint **excluye** automáticamente:

- ❌ Vendedores que NO tienen ventas en el rango seleccionado
- ❌ Clientes que NO compraron en el rango (aunque históricamente hayan comprado)
- ✅ Items que SÍ fueron comprados dentro del rango

### Comportamiento según fechas

| Escenario | Resultado |
|---|---|
| Con `fechaInicio` y `fechaFin` | Solo aparecen vendedores, clientes e items con actividad en el rango |
| Con solo `fechaInicio` | Solo desde esa fecha en adelante |
| Con solo `fechaFin` | Solo hasta esa fecha |
| **Sin fechas** | Mantiene el comportamiento v1.3.0: aparecen vendedores y clientes históricos con `totalCompras: 0` e `items: []` si no tuvieron ventas en el rango |

### Respaldo del comportamiento anterior

Una copia del comportamiento previo a este cambio está guardada en `/impactos/` (no se monta en el router, solo referencia documental). Ver `impactos/README.md`.

## 🔒 Notas de Seguridad

- El endpoint **filtra los datos por rol del token**:
  - Admin ve todos los vendedores
  - Supervisor ve solo los vendedores asignados a él
  - Vendedor ve solo su propio registro
- Los resultados visibles dependen de los permisos del usuario autenticado. No es necesario agregar middleware adicional.

## 📝 Changelog

### v1.4.1
- **Hotfix**: validación numérica en `getBySupervisor` (retorna 400 si no es entero positivo)
- **Hotfix**: agregada ruta deprecated `/vendedor/supervisor/con-items-comprados` que retorna `410 Gone` con la URL correcta
- Documentación: sección "URL ÚNICA Y OBLIGATORIA" para evitar confusión con la URL antigua

### v1.4.0
- **Filtrado estricto por fechas**: cuando se envían `fechaInicio`/`fechaFin`, el endpoint ahora excluye:
  - Vendedores sin ventas en el rango (no aparecen)
  - Clientes sin compras en el rango (no aparecen)
- Si NO se envían fechas, el endpoint mantiene el comportamiento v1.3.0 (compatibilidad hacia atrás)
- Agregado pre-filtrado de IDs de vendedores con ventas en el rango (1 query extra `GROUP BY id_vendedor` en `venta`)
- Respaldo del comportamiento anterior guardado en `/impactos/` (no se monta en el router)

### v1.3.0
- **Eliminada paginación de clientes**: se devuelven todos los clientes de cada vendedor, sin `clientesPage`/`clientesLimit`
- Solo se pagina el nivel de VENDEDORES
- `paginacionClientes` reemplazado por `totalClientes` en la respuesta

### v1.2.0
- **Eliminada paginación de items**: los items se devuelven completos por cliente, sin `itemsPage`/`itemsLimit`
- Bugfix: la query de clientes ahora usa `INNER JOIN` con `venta` filtrado por `id_vendedor`, evitando que se devuelvan los mismos clientes para todos los vendedores
- `paginacionItems` reemplazado por `totalItems` en la respuesta

### v1.1.0
- Endpoint unificado: una sola ruta `/vendedor/con-items-comprados` con detección de rol por token
- Soporte para los 3 roles: admin, supervisor y vendedor
- Corrección de orden: resultados ordenados alfabéticamente por `LOWER(nombre)` y `LOWER(razon_social)`
- Cambio de INNER JOIN a LEFT JOIN: los clientes que no compraron en el rango de fechas siguen apareciendo con `totalCompras: 0` e `items: []`
- Campo `item.nombre` → `item.descripcion` (alineado con el modelo real)
- Campo `item.codigo` → `item.codigo_item` (alineado con el modelo real)
- Eliminada ruta `/vendedor/supervisor/con-items-comprados` (reemplazada por la versión unificada)

### v1.0.0 (Inicial)
- Endpoint creado
- Soporte para lazy loading en 3 niveles
- Paginación flexible por nivel
